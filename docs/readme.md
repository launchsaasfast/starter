# Mazeway Auth

## Introduction

Authentication should live in your project, not a node_modules folder.

Think Clerk, but you own the code.

This is a complete, production-ready auth starter for anyone, including enterprise.

Check out [mazeway.dev](https://mazeway.dev/) if you want!

### The philosophy

People like [Shadcn UI](ui.shadcn.com) because:
- The components are in YOUR project
- You own all the code
- Can do whatever you want with them
- They don't belong in a node_modules folder

Comparing Shadcn UI to bootstrap is like comparing Mazeway to Clerk:

**Clerk**:
- Locked in
- Gets expensive quick
- Can't self host
- Limited customization
- Closed-source
- Still lacks some auth (that you can't add)

---

**Mazeway**:
- Affordable thanks to Supabase
- Can be self-hosted
- Unlimited customization
- Open-source
- Actual complete auth
- Plus:
  - Community-driven
  - More secure
  - Auth config to change common things
  - Later: extensions by the community
  - Acts as a foundation, not a final product. Start here, build on it.

Thanks for letting me roast my competitors. Seriously though, Clerk isn't bad at all, it just serves a different purpose than Mazeway.
- Clerk: for people who want a quick service (Bootstrap people)
- Mazeway: for people who want to own their code and pay less (Shadcn people)

### Tech stack

The project uses modern tech (note that not all are required to setup at all):
- Next.js 15
- Tailwind CSS
- Shadcn UI
- Supabase
- Resend
- Upstash Redis
- Trigger.dev

I see a lot of new apps having only 5% of authentication. Including:
- Missing login page
- No "forgot password" option
- Missing crucial security (2FA, device sessions, email alerts, and more)
- Weird UI glitches with auth
- DDoS attacks for not having proper security and API rate limiting
- HUGE bills, for lack of security again
- This list is usually longer but you get the point

These are the kind of things that should be implemented by default.

That's what this project gives you: a foundation that you can build on.

But just know:
- This project doesn't guarantee 100% security
- Nothing is bulletproof
- Though it does give you a very good foundation

### What's included

- Sign-in options:
  - `Email/password`
  - `Google`
  - `GitHub` (new)
  - More soon! (planned SSO, passwordless, etc)
- Complete authentication flow:
  - Login/signup pages
  - Password reset
  - Device sessions tracking
  - Two-factor authentication (2FA):
    - Authenticator App
    - SMS
    - Backup codes
- Settings
  - Basic profile management
  - Change password
  - Device session management
    - View active sessions
    - Revoke device access
    - Email alerts for new logins
  - Account activity tracking
    - View activity history (logins, disable 2FA, etc)
    - Get alerts for sensitive activity (unknown device login, etc)
  - Enable and disable 2FA (including individual methods)
  - Account connections
     - Allows users to link/unlink social methods
     - View connected methods (obv)
     - Cases like changing email with OAuth-only handled
- Verification:
  - 2FA methods (Authenticator, SMS)
  - Backup codes (for 2FA-accounts)
    - Cryptographically secure
    - Supports multiple formats (words, alphanumeric, numeric)
  - Password verification (no-2FA accounts with password)
  - Email verification (no-2FA accounts)
- API rate limiting with Upstash Redis
- User data exports (GDPR Compliance)
- Bonus: a nice auth config in the project for devs to easily customize things (opens up more things than on this list)

This is only the beginning.

## Getting started

Before we get started, understand:
- Do not at ANY point during this setup think about production
- We will do it LATER. Some examples:
    - "Should I use a professional email here..."
    - "I also need to buy a custom domain"
    - "What about production API keys?"
- Don't think about these things at all.
- For your own sake, don't just copy things
- Actually try to reason about what we're doing

### 1. Install dependencies

In the terminal, run this:
```bash
npm install
```

### 2. Reset project

This is to clean up any setup for the demo so you can start fresh.

Reset it:
```bash
npm run reset-project
```

### 2. Set up Supabase

1. Create a Supabase project
   - Go to [Supabase](https://supabase.com/dashboard/projects)
   - If you don't have an account, create one
   - Click "New project"
   - Name it "my-app-dev" (your actual app name), choose location and generate a database password
2. Get API keys
   - Once the project is fully created, go to [API Settings](https://supabase.com/dashboard/project/_/settings/api)
   - Get your "Project URL", "anon" key and "service_role" key

   > Note that Supabase is changing "anon" and "service_role" to "publishable" and "secret". This may have changed when you're reading this.

3. Update environment variables
   - Open the `.env.example` file
   - Copy the contents to a new file called `.env.local`
   - Replace the values with your own:
     - `NEXT_PUBLIC_SUPABASE_URL`: your project URL from step 2
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: your anon/publishable key from step 2
     - `SUPABASE_SERVICE_ROLE_KEY`: your service role/secret key from step 2

   > Note: The ANON key is designed to be public! See [Reddit discussion](https://www.reddit.com/r/Supabase/comments/1fcndq7/is_it_safe_to_expose_my_supabase_url_and/) and [Supabase docs](https://supabase.com/docs/guides/api/api-keys)

4. Create Supabase tables
   - Head over to the [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql/new)
   - Run these [code snippets](docs/supabase-snippets.md)
   - It'll set up necessary functions and tables
   - Pro tip: look at what you're actually copying/pasting so you know what you're working with

5. Create a bucket for profile pictures
   - Go to [Supabase Storage](https://supabase.com/dashboard/project/_/storage/buckets)
   - Click "Create bucket"
   - Name it "profile-pics"
   - Make it public (major platforms do this, pfps are meant to be public)
   - Under "Additional configuration":
      - Turn on "Restrict file upload size for bucket"
      - Set it to whatever you want (if you don't know, 5MB is good)
      - Set "Allowed MIME types" to "image/webp"
   - Click "Create bucket"
   - Add RLS policies to this bucket (yes you can really do that):
      - Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql/new)
      - Run this query:
      ```sql
      -- Allow users to upload their own profile pictures
      CREATE POLICY "Allow users to upload their own profile pictures" 
      ON storage.objects
      FOR INSERT
      WITH CHECK (
        bucket_id = 'profile-pics' AND
        auth.uid()::text = (storage.foldername(name))[1]
      );

      -- Allow users to update/replace their own profile pictures
      CREATE POLICY "Allow users to update their own profile pictures"
      ON storage.objects
      FOR UPDATE
      USING (
        bucket_id = 'profile-pics' AND
        auth.uid()::text = (storage.foldername(name))[1]
      );

      -- Allow users to delete their own profile pictures
      CREATE POLICY "Allow users to delete their own profile pictures"
      ON storage.objects
      FOR DELETE
      USING (
        bucket_id = 'profile-pics' AND
        auth.uid()::text = (storage.foldername(name))[1]
      );
      ```
      
6. Change email templates
   - Go to [Supabase Email Templates](https://supabase.com/dashboard/project/_/auth/templates)
   - Copy and paste these [email templates](docs/supabase-email-templates.md)

7. Add redirect URLs in Supabase
   - Go [here](https://supabase.com/dashboard/project/_/auth/url-configuration)
   - Add these redirect URLs
      - `http://localhost:3000/api/auth/callback`
      - `http://localhost:3000/api/auth/confirm`
  - Ensures Supabase can actually redirect to these routes

8. Syncing user email

   "Syncing user email? What? Why?"
   
   Alright, let me break it down:
   - We created some Supabase tables earlier. Remember?
   - One of those were a "users" table.
   - This table includes an "email" column
   - Supabase also stores an email in the auth user
   - We need to make sure these are in sync
   
   The solution? Stupid simple. Let's set it up:
   - Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql/new)
   - Run this code:
   ```sql
   CREATE OR REPLACE FUNCTION public.update_user_email()
   RETURNS TRIGGER AS $$
   BEGIN
     -- Only update if email has changed
     IF NEW.email <> OLD.email THEN
       UPDATE public.users
       SET email = NEW.email
       WHERE id = NEW.id;
     END IF;
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   
   -- Trigger to call the function on UPDATE in auth.users
   CREATE OR REPLACE TRIGGER on_auth_user_updated
   AFTER UPDATE ON auth.users
   FOR EACH ROW
   EXECUTE FUNCTION public.update_user_email();
   ```
   This will:
      - Create a function that updates the email column to whatever is in auth
      - Make a trigger on the users table to call this function when a row changes

   Done!

### 3. Set up Resend (optional)

Supabase (as of now) gives you 2 free emails per hour but it's unreliable. Sometimes, unclear errors will pop up because of their SMTP and you might end up spending hours debugging it.

You can totally skip setting up Resend but be mindful that if auth doesn't work, setting up Resend will probably fix it.

Aside from that, the project uses Resend for:
- Email alerts
- Device verification
- Email verification

If you don't set up Resend:
- Users won't get email alerts at all
- Device verification will be disabled entirely
- Email verification won't be enabled
- All devices will be "trusted" by default
- None of this really matters for development

With that out the way, here's how to do it:

**Luckily...**
Resend makes it really straightforward to integrate with Supabase.

You won't even need to touch the Supabase dashboard to do it.

1. Get a domain if you don't already have one
   - You can buy a domain at [Namecheap](https://namecheap.com) (not a sponsor)
2. Create a Resend account and add your domain
   - Go to the [Resend website](https://resend.com)
   - Create an account or login
   - Go to [Resend Domains](https://resend.com/domains)
   - If you don't know how to add a domain, there's a little button that says "How to add records". It's super clear what to do, so just follow that.

3. Create an API key
   - Once you have a domain, go to [Resend API Keys](https://resend.com/api-keys)
   - Click "Create API key"
   - Enter a name for the API key (like your app name), then change "permission" to "Sending access" and click the "Domain" field to change it to the one you just added
4. Integrate with Supabase
   - Go to [Resend Integrations](https://resend.com/settings/integrations)
   - You should see Supabase listed. Click "Connect to Supabase"
   - Resend will request access to your Supabase organization. Click "Authorize Resend"
   - Select your Supabase project
   - Select the domain you just added
   - Configure custom SMTP (this sounds super complicated but it's not. It's already configured. Just change the `Sender name` and click `Configure SMTP integration`)
   - Update your `.env.local` file to add these (this is because aside from Supabase, the project uses Resend too. Supabase won't use this, but the project will for custom things that Supabase doesn't offer out of the box, like email alerts):
   ```diff
   - RESEND_API_KEY=your-resend-api-key
   - RESEND_FROM_EMAIL="Auth <auth@yourdomain.com>"
   + RESEND_API_KEY=your-resend-api-key
   + RESEND_FROM_EMAIL="Your_name <example@yourdomain.com>"
   ```

### Congrats! 🎉

You just set up everything you need for the auth to work. You can go ahead and run `npm run dev` in the terminal, and head over to `http://localhost:3000` in the browser to test it out.

> [!NOTE]
> When running the dev server, you may see a warning in your console about `supabase.auth.getSession()` being potentially insecure. This is a [known issue](https://github.com/supabase/auth-js/issues/873) with the Supabase auth library and can be safely ignored. The warning is a false positive - this project follows all security best practices and uses the recommended `@supabase/ssr` package correctly.

## Auth configuration

The project has an auth config at `src/config/auth.ts`. This allows you to change common settings without diving into the auth code.

You're not limited to these customization options (you own the auth) but it's just a quick way to configure common things.

### Quick reference

- **Social Providers**
    - Google
    - GitHub
- **Verification Methods**
  - Email
  - Password
  - Two-Factor
    - Authenticator
    - SMS
    - Backup Codes
- **Backup Codes**
  - Format
  - Count
  - Word count
  - Alphanumeric length
- **Device Sessions**
  - Max age
- **Security**
  - Sensitive action grace period
  - Require Fresh Verification
    - Revoke devices
    - Delete account
- **Device Verification**
  - Code expiration time
  - Code length
- **Email Alerts**
  - Login (enabled, alert mode, confidence threshold)
  - Password (enabled, alert on change, alert on reset)
  - Email (enabled, alert on initiate, alert on complete)
  - Two-Factor (enabled, alert on enable, alert on disable)
  - Device Sessions (enabled, alert on revoke)
  - Account Deletion (enabled, alert on initiate)
- **Data exports**
  - Enabled (true or false)
- **Email Verification**
  - Code expiration time
  - Code length
- **Password Reset**
  - Require relogin after reset
- **API Rate Limiting**
  - Enabled
- **Password Requirements**
  - Minimum length
  - Maximum length
  - Require lowercase
  - Require uppercase
  - Require numbers
  - Require symbols

### Social providers

All the social providers are **disabled by default** in the auth config.

This allows you to enable just what you actually need. The instructions below show you how to set up each provider.

PLEASE UNDERSTAND:
- This section only covers development
- You're gonna be setting up Google OAuth for development first
- When you're ready for production, the "Go in production" section got you covered

#### Enable Manual Linking

Before setting up any providers, you need to enable manual linking in Supabase.

What even is this? Quick explanation:
- Supabase offers two ways for linking:
   - Automatic linking
   - Manual linking
- What's the difference?
   - Manual linking
      - Users must connect social providers in settings.
      - If a user tries to sign in with Google
      - But the account isn't connected to that provider
      - It won't automatically log in
    - Automatic linking
       - Users cannot connect/disconnect providers in settings
       - If a user accidentally connects GitHub...
       - They can't disconnect it again
       - If user signs in with a provider, it automatically gets connected
- This auth starter uses manual linking because:
   - Allows users to connect/disconnect providers from settings
   - It's more secure (requires explicit user action)
   - Matches how serious apps do it (thus making your app appear more serious)
   - Prevents accidental account linking (happens)
   - I got roasted on Twitter at 1 AM and fixed it ([Source](https://x.com/mazewaydotdev/status/1904317131971276993))
- "But automatic linking is more convenient"
   - Yeah and more confusing?
   - What do you want? Good or bad UX?
   - Automatic linking creates a worse UX

If you're too lazy to read that, in short:
- Automatic linking is a terrible UX
- Your app looks more serious with manual linking

Here's how:
1. Go to [Supabase Auth Providers](https://supabase.com/dashboard/project/_/auth/providers)
2. Look for "Allow manual linking"
3. Enable it

That's it!

#### Google

1. Configure Google Auth
    - Go to [Google Cloud Console](https://console.cloud.google.com/)
    - Create a new project in the top left corner
    - Go to APIs and services -> OAuth consent screen ([direct link](https://console.cloud.google.com/auth/overview))
    - Click "Get started" and enter an app name in the "App name" field (eg: auth-starter)
    - Choose your email for "User support email"
    - For the Audience, select External
    - Enter an email for "Contact Information"
2. Update Auth Branding
    - In the left sidebar, go to "Branding" ([link](https://console.cloud.google.com/auth/branding))
    - Scroll down to "Authorized domains" and click the "ADD DOMAIN" button. Enter your Supabase project URL here. We got this in the early steps. It should look like `<PROJECT_ID>.supabase.co`.

    > Note: The URL shouldn't include the `https://` part
3. Create OAuth client (previously OAuth credentials)
    - Go to: [Google OAuth Clients](https://console.cloud.google.com/auth/clients)
    - Click "create client"
    - For "Application type", choose "Web application".
    - Under "Authorized JavaScript origins", add your site URL which is `http://localhost:3000`

    - Under "Authorized redirect URLs", enter the "callback URL" from the Supabase dashboard. To get it, follow these steps:
        1. Go to [Supabase Auth Providers](https://supabase.com/dashboard/project/_/auth/providers)
        2. Scroll down until you see "Google" and expand it
        3. You'll find a field labeled "Callback URL (for OAuth)".
        
    - In the Google console, click "create" and you will be shown your "Client ID" and "Client secret"
    - Copy those, go back to Supabase and paste those. Then click "Save"

4. Enable Google in the auth config
    - Open up `src/config/auth.ts`
    - Enable the Google provider:
    ```diff
    socialProviders: {
      google: {
    -   enabled: false,
    +   enabled: true,
      },
    }
    ```

#### GitHub

1. Get your callback URL from Supabase
    - The next step requires a callback URL
    - Go to [Supabase Auth Providers](https://supabase.com/dashboard/project/_/auth/providers)
    - Expand "GitHub"
    - Copy the "Callback URL"
2. Register a new OAuth app on GitHub
    - Go to [GitHub OAuth Apps](https://github.com/settings/developers)
    - Click "New OAuth app"
    - For "Application name" enter your app's name
    - Enter `localhost:3000/` for the homepage URL (don't worry about production, it's covered in the "Go in production" section)
    - Paste the "Callback URL" into the "Authorization callback URL" field
    - Click "Register application"
3. Get your credentials and add them 
    - Click "Generate a new secret"
    - Copy both your "Client ID" and the secret you just generated
    - Go back to the [Supabase GitHub provider](https://supabase.com/dashboard/project/_/auth/providers?provider=GitHub)
    - Add your Client ID and secret here

### Verification Methods

The following methods are available:
- Email verification
- Password verification
- Authenticator (2FA)
- SMS (2FA)
- Backup codes (2FA)

#### Setting up SMS two-factor auth

I really don't see why you'd do this because:
- Costs money (per SMS, monthly fees, registration fees)
- Compliance headaches (A2P 10DLC registration, carrier approvals)
- Different rates per country (good luck with that pricing)
- Phone numbers change
- Authenticator apps are:
  - Free
  - Work offline
  - More secure
  - No compliance bullshit
  - No carrier drama

Good news:
- This starter does support SMS
- You don't need to dig into the code to implement it

But, consider if you really need this. The only benefits SMS has:
- Users know it
- Nobody knows what an authenticator app is

Though I'd argue both points:
- If apps keep using SMS, users will NEVER adapt to anything more secure
- They don't know SMS isn't secure (it isn't)
- The more apps that start to ditch SMS (and introduce more secure methods) the faster users will adapt
- Just like users adapted to making passwords more complicated (uppercase, special characters)

If you really want to flex that your auth system can do everything:

1. Create a Twilio account
   - Go to [Twilio's website](https://www.twilio.com/try-twilio)
   - Sign up for a free account
   - Verify your email and phone number
2. Get account credentials
   - After verification, you'll be taken to your console
   - If you didn't, here's a link: [Twilio Console](https://console.twilio.com/)
   - Scroll down to "Account Info"
   - You'll see:
   ```
   Account SID: AC********************************
   Auth Token: ********************************
   ```
   - We'll need to add these to Supabase in a bit. You can (temporarily) store them somewhere like a note. Just be sure to delete it when we're done.
3. Get a phone number
   - In Twilio Console, go to "Phone Numbers" > "Manage" > "Buy a number" (it's free)
   - Or direct link: [Buy a Number](https://console.twilio.com/us1/develop/phone-numbers/manage/search)
   - Click "Buy" on a number (trial accounts get a free number, you should have that if you just created it)
   - If you click "Configure number" you may see a warning and 2 notes
     - Don't let them overwhelm you. They just make shit seem overcomplicated for no reason.
     - First note about "A2P 10DLC":
       - Just a fancy way of saying "business texting from regular numbers"
       - US carriers want to prevent spam
       - Twilio makes businesses register their SMS use-case
       - Like telling them "yeah we're just doing 2FA codes"
       - Trial accounts can skip this (only needed for production)
     - Second note about some CSV Report:
       - Just a way to check if your numbers are registered
       - Again, trial accounts don't need this
       - It's for big companies managing lots of numbers
     - Last warning about "Emergency Address":
       - This doesn't even apply to us
       - Because we're only using SMS, no calls.
4. Create a Twilio messaging service
   - Direct link: [Create Messaging Service](https://console.twilio.com/us1/service/sms/create?frameUrl=%2Fconsole%2Fsms%2Fservices%2Fcreate%3Fx-target-region%3Dus1)
   - Friendly name: your app name (eg: My App)
   - Select "Verify users" as the use case
   - Click "Add Senders" on step 2,
   - For "Sender Type" the default should already be "Phone Number". If not, select that.
   - Click "Continue"
   - You should see the phone number listed that you bought earlier. Select it
   - Click "Add Phone Numbers"
   - Now, go to "Properties" (direct link: [Messaging Properties](https://console.twilio.com/us1/service/sms/_/messaging-service-properties?frameUrl=%2Fconsole%2Fsms%2Fservices%2FMG3fd63140e331b046c661d315701decbc%2Fproperties%3Fx-target-region%3Dus1))
   - Here, you'll find "Messaging Service SID". We're going to need this now! (along with the other things we got earlier)
5. Connect Supabase with Twilio
   - Go to [Supabase Auth Providers](https://supabase.com/dashboard/project/_/auth/providers)
   - Expand "Phone" and enable it
   - SMS provider: Twilio
   - Twilio account SID: you got this from step 2
   - Twilio auth token: and this from step 2
   - Messaging Service SID: what we just got
   - Ignore the "Twilio Content SID" field because that's for WhatsApp
   - Turn OFF "enable phone confirmation" because:
     - it would force users to enter a phone number on sign up
     - it's different from 2FA (what we're doing)
     - so users will be able to sign up with email and password
     - then later, add their phone number as 2FA for extra security
   - Click "Save"
6. Update the auth config to enable SMS as a 2FA method:

```diff
{
    title: "SMS",
    description: "Receive a verification code via SMS",
    type: "sms" as TTwoFactorMethod,
-   enabled: false,
+   enabled: true,
}
```

What you need to know:
- For development (with a trial account) you can only send SMS messages to verified numbers
- "Verified numbers" is the ones you manually verify in the Twilio console
- When you signed up for an account and verified a phone number, that counts as one.
- That means, when you try out the auth with SMS, use the phone number you verified with Twilio in the app
- When going in production, there's a production checklist that got you covered.

### Requiring re-login after password reset

This is **disabled by default** in the auth config. If you want to enable it, here's what you should do:

1. Generate a recovery key
   - Install OpenSSL if you don't already have it
   - Then run this in the terminal:
   ```bash
   openssl rand -hex 32
   ```
2. Update environment variables
   - Copy the generated recovery key
   - Add it to your environment variables (`.env.local`):
   ```diff
   - # RECOVERY_TOKEN_SECRET=your-recovery-token-secret
   + RECOVERY_TOKEN_SECRET=your-recovery-token-secret
   ```

### Setting up user data exports

Quick thing:
- If you're gonna have EU users, you'll need to do this (according to GDPR Compliance)
- Only when you actually go in production though

Reminder:
- This is only gonna cover development
- Don't worry about production yet
- If you're really that curious, go to the "Go in production" section

We're gonna use Trigger.dev because:
- Built for what we're trying to do
- Can run tasks for a long time and queue them
- Free tier is really generous
- Literally best DX you'll feel

Super easy to do:

1. Create storage buckets
    - Go to [Supabase Storage](https://supabase.com/dashboard/project/_/storage/buckets) 
    - Create a bucket named "exports"
    - Click "Save"
    
    > This is the bucket where user export files are stored
    >
    > The bucket should **not** be public!
    >
    > By making it private, only the service role key will have access
    >
    > Which is what we want.

2. Create data export requests table

   - Go to the [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql/new)
   - Run this:
   ```sql
   -- Create data_export_requests table
   CREATE TABLE data_export_requests (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid REFERENCES users(id) ON DELETE CASCADE,
     status text NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
     token_hash text NOT NULL,
     salt text NOT NULL,
     token_used boolean DEFAULT false,
     error text,
     created_at timestamp with time zone DEFAULT now(),
     completed_at timestamp with time zone,
     updated_at timestamp with time zone DEFAULT now()
   );
   
   -- Enable RLS
   ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;
   
   -- No RLS policies - all access through service role
   
   -- Create trigger for updated_at
   CREATE TRIGGER update_data_export_requests_updated_at
   BEFORE UPDATE ON data_export_requests
   FOR EACH ROW
   EXECUTE FUNCTION update_updated_at_column();
   
   -- Create index for faster user lookups
   CREATE INDEX idx_data_export_requests_user_id 
   ON data_export_requests(user_id);
   
   -- Create index for finding pending requests to process
   CREATE INDEX idx_data_export_requests_status 
   ON data_export_requests(status) 
   WHERE status = 'pending';
   ```

   > This table is just used for tracking exports for accounts. It's not a queue

3. Create a Trigger.dev project
   - Sign up for [Trigger.dev](https://trigger.dev)
   - Complete the onboarding
   - Create an organization
   - Choose the free plan
   - Create a project

4. Init Trigger.dev in the project
   - Run this in the terminal:
   ```bash
   npx trigger.dev@latest init
   ```
   - Authenticate if needed
   - Select your project
   - Trigger.dev directory: default
   - Choose an example to create: None

5. Add the dev API key to your `.env.local`:
   - Go to "API Keys" in the Trigger.dev dashboard
   - They already created keys for you! Just grab the `Dev` one
   ```diff
   - # TRIGGER_API_KEY=your-trigger-api-key
   + TRIGGER_API_KEY=your-trigger-api-key
   ```

6. Enable data exports in the auth config (`src/config/auth.ts`):
   ```diff
   dataExport: {
   - enabled: false,
   + enabled: true,
   }
   ```

7. That's it! You've successfully set up user data exports.

**Testing it out:**

1. Make sure you've:
   - Added the Trigger.dev API key to your environment variables
   - Enabled data exports in the auth config
2. Then run these commands in the terminal:

   Start the Next.js server
   ```bash
   npm run dev
   ```

   Start the Trigger.dev server (need this during development)
   ```bash
   npx trigger.dev@latest dev
   ```
3. Go to `localhost:3000` account -> data
4. Watch the magic happen in the [Trigger.dev dashboard](https://cloud.trigger.dev)

**What about production?**
I wasn't gonna write this section here at first.

Didn't want you to worry about production yet.

But they're kind of confusing with it so I'll make it extremely clear right away:
- When you create a project, you get two API keys
- One for dev, one for production
- During development, you will have to run `npx trigger.dev@latest dev`
- In production, you don't because the prod key just works

Now, don't worry about production anymore. Just wanted to clear that uo.

**What users will see:**
- "Download data" button in Account -> Data
- Progress of current and recent exports
- Account security events about requesting an export
- Request email like "You requested an export" (without a download link)
- Download link through their email when processing is done

**How it works**
Here's how the data export process actually works:

1. **User requests data export**
   - User clicks "Export my data" in the UI
   - Frontend calls `POST /api/data-exports`

2. **Request processing**
   - We create a record in the `data_export_requests` table with status "pending"
   - This table isn't a queue - it's just for tracking requests and showing status in the UI
   - We generate a secure one-time token, hash it, and store the hash in the database
   - We send a confirmation email to the user without download link (security email)
   - We create a task in Trigger.dev (implementation: `src/trigger/export-user-data.ts`)

3. **Why use Trigger.dev?**
   - We could just have a simple Next.js route to get data and send right?
   - Well, API routes have execution limits (typically 10-30 seconds)
   - Data exports can be large and time-consuming
   - Trigger.dev handles the queue, retries, and long-running operations
   - Tasks run asynchronously, so users don't have to wait

4. **Background processing**
   - When the task runs, it:
     - Fetches the user's data (profile, events, basically any data the user owns)
     - Formats everything into a JSON file
     - Uploads the file to Supabase Storage in the `exports` bucket
     - Updates the request status to "completed"
     - Creates a download link with the one-time token we generated earlier
     - Sends an email with the download link

5. **Security measures**
   - The exports bucket has RLS but no policies - which makes it completely private. Only the service role can access it
   - Files are stored in user-specific folders (`exports/{userId}/{exportId}.json`)
   - Download links contain a one-time token that expires
   - Tokens are hashed in the database (never stored in plain text)
   - Files are automatically deleted after download

6. **Download process**
   - User clicks the link in their email
   - Link goes to `GET /api/data-exports/[id]/download?token=xxx`
   - API verifies the token against the stored hash
   - If valid, the file is streamed to the user
   - After download, the file is deleted from storage

That's it. Secure, works well, and keeps the EU regulators off your back.

**Adding your app's data:**
This starter includes GDPR-compliant data exports for auth data, but you'll need to extend it with your app's data.

Here's a simple example. Let's say you have a notes app where users can create and save notes:

```typescript
// In src/trigger/export-user-data.ts

// Get user's notes
// NOTE: Always use adminClient in this file!
// This is because it doesn't create cookies
// Which Trigger.dev doesn't like
const { data: notes } = await adminClient
  .from("notes")
  .select("*")
  .eq("user_id", userId);

// Add them to the export data
const exportData = {
  // Keep the existing auth data
  user: userData,
  events: events || [],
  devices: devices || [],
  
  // Add the user's notes
  notes: notes || [],
  
  exported_at: new Date().toISOString(),
};
```

**What data should you include?**
Simple rule: If users created it or it's part of their personal activity, include it.

✅ Include:
- Content they created (posts, comments, etc)
- Files they uploaded
- Their profile info
- Their activity (liked posts, saved items, playlists)
- Purchase history
- Preferences and settings they chose

❌ Skip:
- Internal flags
- App settings (like 2FA status)
- Other users' data
- System-generated recommendations

That's it! Just add whatever data your users create or interact with to the export. Keep it simple.

**"But what about scale?"**
Short answer: free tier is more than enough for this

Long answer:

Let's do some math:
- Average user exports once a year (being generous)
- Maybe 5% of users ever click that button
- Free tier: 10 concurrent jobs

For this to be a "problem":
```typescript
dailyRequests = 2,880 // 120 per hour × 24 hours
usersWhoExport = dailyRequests × (365 / 5%) // yearly users needed
// = 21,024,000 users 
```

You would need 21 MILLION users to max out the free tier! And even then:
- Users expect to wait (Instagram takes 24-48h)
- They get an email when it's ready
- The queue can be infinite
- Nobody's sitting refreshing "export my data"
- Most users export once and never again
- Each export takes seconds often (not the 5 mins we calculated with)

Reality check:
- You probably don't have 21M users
- If you do, you can afford the paid tier
- You're still faster than Meta
- Nobody has ever complained about waiting for their GDPR export

TL;DR: The free tier is fine until you're literally Instagram-scale. And by then you can probably afford the paid tier

### Password requirements

- `minLength`: Minimum characters a password can be
  > [!NOTE]
  > If you change this value, you must also change it in your Supabase dashboard.
  >
  > You can do that [here](https://supabase.com/dashboard/project/_/auth/providers?provider=Email)

All the other password requirements are self-explanatory.

**Warning ⚠️**

- Never change the "password requirements" directly in the Supabase dashboard!
- Our app already implements this securely through API routes by validating the password requirements in our auth config.
- If you change it in the Supabase dashboard, it'll be inconsistent with the app.

## Get to know the project better

### Data Fetching Strategy: SWR + API Utility

> [!WARNING]
> Never use `supabase.auth.getUser()` directly. Instead:
> - In client components: use the `useUser()` hook
> - In server contexts (API routes, server components, middleware, etc): use `getUser()` from `@/utils/auth`
>
> This ensures you always get the complete user data (both auth and profile) in a consistent format.
>
> Special cases:
> - During post-auth flow where profile doesn't exist yet: use `getUser({ requireProfile: false })`

You might notice we use two different approaches for handling data and API calls. This isn't an accident - each serves a specific purpose:

1. **Getting User Data**:
   - Client Components: Use the `useUser()` hook
     ```typescript
     const { user, isLoading } = useUser();
     ```
     - Automatically keeps user data in sync
     - Handles caching and revalidation
     - Returns complete user data (`TUserWithAuth` type)
   
   - Server Contexts: Use the `getUser()` utility
     ```typescript
     const { user, error } = await getUser(supabase);
     ```
     - Use in API routes, server components, utilities
     - Returns complete user data consistently
     - Combines auth data with profile data

2. **SWR Hooks** (`/hooks/use-auth.ts`):
   - Think of these as "data subscribers"
   - Perfect for data that changes and needs to stay fresh (like user data)
   - Automatically revalidates when you:
     - Switch back to the tab
     - Reconnect to the internet
     - Make changes that affect the data
   - Example: `useUser()` hook keeps the user's data in sync across the app
   - Only handles reading and subscribing to data, not mutations

3. **API Utility** (`/utils/api.ts`):
   - Think of this as your "action caller"
   - Handles one-off actions like login, signup, or enabling 2FA
   - Provides consistent error handling (no more try-catch everywhere)
   - Gives you proper TypeScript types for requests/responses
   - Example: `api.auth.login()` for handling authentication
   - Only handles mutations and actions, not data subscriptions

Example:

```typescript
// In a component...

// 1. Call API to log in
const result = await api.auth.logout();
```

**Checking if the user has backup codes**

> [!WARNING]
> Never trust the column "has_backup_codes" on the server as it can be manipulated.
>
> It's safe to use on the client for UI purposes since it's non-critical

Here's how to check if the user has backup codes:

   - In client components: use the `useUser()` hook
   - In server contexts (API routes, server components, middleware, etc): use `getUser()` from `@/utils/auth`

   This ensures you always get the complete user data (both auth and profile) in a consistent format.

- On the client
   ```typescript
   import { getUserVerificationMethods } from "@/utils/auth"
   import { createClient } from "@/utils/supabase"

   const supabase = createClient();
   
   // This checks if the "has_backup_codes" column on the users table
   const { methods } = await getUserVerificationMethods({ supabase });
   ```

- On the server
   ```typescript
   import { getUserVerificationMethods } from "@/utils/auth"
   
   const supabase = createClient();
   const supabaseAdmin = createClient({ useServiceRole: true });

   // This uses the service role key to check the "backup_codes" table
   // It's reliable because the backup_codes table doesn't allow reading data at all
   // Only the service role key can read the data because it bypasses RLS entirely
   const { methods } = await getUserVerificationMethods({ supabase, supabaseAdmin });
   ```

### Types: where they are and why the naming convention

We define types here `src/types`. We have:
- `src/types/api.ts` (API requests and responses)
- `src/types/auth.ts` (anything auth related)

You might also notice we prefix types as "T". This is intentional to avoid name conflicts with components and types.

By "types", I mean interfaces and types.

Examples:
`TUser`
`TAuthError`

### API routes VS server actions: why we use API routes

API routes seemed like a better option because:
- Can't use server actions outside of Next.js app (for mobile app etc)
- Some API routes (like `/api/auth/callback`, `/api/auth/confirm` and `/api/auth/post-auth`) can't be server actions because they're used by external services
- At that point, why sometimes use routes and other times server actions?

API routes are also a pretty common standard for auth-related things.

### How auth errors work

The `/auth/error` page is just for generic, "can't recover" errors.

Usually, the API route responds with an error so the frontend can show it to the user.

In some cases, there is no frontend to display errors, for API routes like:
- `callback`
- `confirm`
- `post-auth` (for successful login/signup)

That's why we have a generic auth error page. For most stuff, the API responds with error/success.

### Email templates

Most templates will actually be in your Supabase dashboard. The ones you can find in there are:
- Confirm sign up
- Invite user
- Magic Link
- Change Email Address
- Reset Password
- Reauthentication

All other email templates live in this project in `/emails/templates`. You'll find:
- Verify device (`/emails/templates/device-verification.tsx`)
- Email alert (`/emails/templates/email-alert.tsx`)
- Verify email (`/emails/templates/email-verification.tsx`)

Separating the email templates wasn't a design choice. It sucks a little because you have email templates in 2 different places. But how often do you change these? Probably never. Not a huge concern. Just wanted to make you aware of that.

Now: coolest thing ever? The email templates in the project uses react-email (which is cool). Watch this:

try running this command in the terminal:

```bash
npx react-email dev
```

It should give you a localhost URL (eg: `http://localhost:3000`). Just copy that and paste it into the browser.

Next, expand "templates" in the sidebar and click any templates. You can preview them here! 🎉

For the email templates in your Supabase dashboard, you can preview them directly there.

### Auth in API routes, components for rendering

For example:

- ❌ We don't do this in a component:
```typescript
supabase.auth.signInWithEmailAndPassword();
```

- ✅ We call an API route to logout the user:
```typescript
import { api } from "@/utils/api";

api.auth.logout(); // this will do a fetch call to our login route
```

Reasons:
1. Security: API routes can implement additional security checks
2. Separation of concerns: auth lives in the API routes, components/pages handle the UI
3. Consistency: all auth flows go through API routes
4. Rate limiting: we can apply rate limiting to auth endpoints
5. Error handling: centralized error handling for auth operations
6. Logging: easier to track auth events and debug issues
7. Future-proofing: if we need to add more auth features, we know exactly where they go

### Difference between forgot password, change password and reset password

Notice how we got 3, very similar API routes?
- `/api/auth/forgot-password`
- `/api/auth/change-password`
- `/api/auth/reset-password`

The names look similar, but they serve entirely different purposes.
- `/api/auth/forgot-password`: Sends a password reset email
- `/api/auth/change-password`: Used to change the password of authenticated users. It accepts a current and new password.
- `/api/auth/reset-password`: Part of the forgot password flow: it takes a new password and a token, which it uses to update the password.

### Why we use a custom function to verify passwords

When you need to verify a user's password (like when changing it or doing sensitive stuff), your first thought is probably:

```typescript
const { error: signInError } = await supabase.auth.signInWithPassword({
  email: user.email!,
  password: currentPassword,
});
```

Seems super simple, right? But it doesn't actually work.

Here's the problem: If a user has 2FA enabled and they're at AAL2 (Authenticator Assurance Level 2), calling `signInWithPassword` will reset their session to AAL1. This means they'd need to verify 2FA again... just to verify their password. That's a terrible UX and creates an annoying security loop.

So instead, we use a custom Postgres function wrapped in a simple utility:

```typescript
import { verifyPassword } from "@/utils/auth";

const isValid = await verifyPassword(supabase, currentPassword);

if (!isValid) {
  // Handle invalid password...
}
```

The Supabase RCP function the `verifyPassword` utility uses is actually pretty straightforward:
- It takes a password and checks if it matches what's stored
- Uses the same crypto as Supabase Auth (so it's secure)
- Returns true/false without messing with the session
- The user stays at AAL2 if they were already there

### Custom device sessions VS Supabase auth sessions

I'm not even gonna pretend like this is a feature. But look:
- We have `public.device_sessions`
- And Supabase manages `auth.sessions`

**Are we basically reinventing the wheel with our custom solution?**

Yes.

**Why not just use Supabase's sessions?**

You see, Supabase sessions are super limiting.

We want to be able to:
- Programmatically revoke sessions
- Track sessions
- Have a little control over the AAL (notice we have an aal column in the device sessions table)

What Supabase sessions give us is everything but that.

Thought important to note: we're not ditching Supabase auth sessions!

They work great together. We're just adding custom stuff on top of their implementation.

### Getting the Authentication Assurance Level (AAL)

> [!WARNING]
> Never trust `supabase.auth.mfa.getAuthenticatorAssuranceLevel()`. This is only set by Supabase and it doesn't reflect our app's logic.
>
> Instead, you should use our `getAuthenticatorAssuranceLevel` utility (`src/utils/auth.ts`) which respects backup codes.
>
> The reason is Supabase does not natively support backup codes. So we implement a custom solution. When a user verifies using one of these, we can't set `supabase.auth.mfa.getAuthenticatorAssuranceLevel`. Instead, we update the `aal` column on a device session to aal2 after successful verification.

## Recommended for production

### Change Email OPT Expiration

By default, Supabase likes to put it at 24 hours.

That makes zero sense because then they tell you to lower it down to 1 hour (or below).

So let's go ahead and make Supabase happy:
1. Go to [Supabase Auth Providers](https://supabase.com/dashboard/project/_/auth/providers)
2. Expand the "Email" provider
3. Scroll down to "Email OTP Expiration"
4. Set it to "1800" (1 hour)
5. Click "Save"

### Clean up database automatically

Some things will pile up in your database over time (verification codes, expired device sessions, eg), but it's not that crucial to clean them up right away.

Even in early production, your database won't explode from some old data lying around (most data gets cleared by the code anyway)

If you do want to set it up, check out [this guide](docs/cleanup-setup.md).

### API Rate limiting (with Upstash Redis)

Yes, this does introduce another service you'll need to set up but:
- You literally need to get 2 API keys.
- Takes a minute or so to do
- Insanely common amongst Next.js apps

Here's how to do it:
1. Set up an Upstash account and database
   - Go to the [Upstash website](https://console.upstash.com/login)
   - Create an account or log in
   - Click "create database"
   - Name it whatever you want like "auth-rate-limit"

2. Configure database settings
   - Primary region: wherever you plan to host your app.
       - It should be closest to where your Next.js app is hosted (for faster performance), not your users. This is because the API routes in this project will use this Upstash Database. The client will never.
       - For development, the region doesn't really matter.
   - Choose a plan: just go free with for now because:
     - You get 10K commands per day
     - With API rate limiting, each API request might use 2-3 Redis commands to:
       - Get the current request count
       - Increment it
     - Upgrade when you need
   - Click "create"

3. Get API credentials and update environment variables
   - Get your `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`:
     - Scroll down to the "REST API" section
     - Look above the code snippet, you should see them here
   - Update `.env.local` file to add these:
     ```diff
     - # UPSTASH_REDIS_REST_URL=your-upstash-redis-rest-url
     - # UPSTASH_REDIS_REST_TOKEN=your-upstash-redis-rest-token
     + UPSTASH_REDIS_REST_URL=your-upstash-redis-rest-url
     + UPSTASH_REDIS_REST_TOKEN=your-upstash-redis-rest-token
     ```

> In the auth config of this project (`src/config/auth.ts`) API rate limiting is already enabled by default. If you ever need (to test something for example), you can disable it in the config.

### User data exports

If you're gonna have EU users and you don't wanna get yourself in trouble, please set this up.

The section "Auth configuration" will guide you

## Go in production

This is gonna be an actionable, step-by-step guide to get your app in production.

### 1. Create production environment variables

- Create a new file called `.env.production`
- Copy the contents of `.env.local` to it
- Replace the values with your own:
  ```diff
  - NEXT_PUBLIC_SITE_URL=http://localhost:3000
  + NEXT_PUBLIC_SITE_URL=https://<PRODUCTION_SITE_URL>
  ```

### 2. Set up Supabase for production

We're going to be creating an extra Supabase project for production. Why? Because you wanna be able to safely change things in your database and play with fire without affecting actual users.

Technically, Supabase does offer a "branching" feature that lets you use the same project for dev/production but you'd need:

- the $25/month Supabase subscription
- pay $0.32 PER DAY PER BRANCH

If you're ready for that, feel free to go that route.

For the people who just wanna get started without worrying about some fancy feature that'll cost them their entire life savings, you're gonna want 2 Supabase projects. One for development, and one for production.

#### 1. Create a new Supabase project
   - Go to [Supabase](https://supabase.com/dashboard/projects)
   - Click "New project"
   - Name it "my-app-prod" (your actual app name), choose location and generate a database password

#### 2. Get API keys
   - Once the project is fully created, go to [API Settings](https://supabase.com/dashboard/project/_/settings/api)
   - Get your "Project URL", "anon" key and "service_role" key (this is for the production project)

#### 3. Add API keys to production environment variables
   - Open the `.env.production` file
   - Replace the following values with your own (and keep any other variables you have):
   ```diff
   - NEXT_PUBLIC_SUPABASE_URL=https://<PROJECT_ID>.supabase.co
   - NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY>
   - SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY>
   + NEXT_PUBLIC_SUPABASE_URL=https://<PRODUCTION_PROJECT_ID>.supabase.co
   + NEXT_PUBLIC_SUPABASE_ANON_KEY=<PRODUCTION_ANON_KEY>
   + SUPABASE_SERVICE_ROLE_KEY=<PRODUCTION_SERVICE_ROLE_KEY>
   ```

#### 4. Set up Supabase project

Here's the thing: Supabase doesn't have a "duplicate project" feature. Yeah, it sucks.

You'd think you could just click a button to copy your dev project to production, but no. Traditionally, you'd have to manually recreate everything:
- Tables
- RLS policies
- Functions
- Etc

Going back and forth between projects, copying SQL, praying you didn't miss anything...

BUT WAIT. There's actually a solution.

You can dump your ENTIRE database schema with one command.

Let's go ahead and firstly set up the database for the production project:

1. Make sure you have Docker installed
    - If you don't, get it [here](https://www.docker.com/)
2. Open the Docker Desktop app
3. Get your Supabase connection string (session pooler)
    - Go to the [Supabase Dashboard](https://supabase.com/dashboard/project/_)
    - Make sure your dev project is selected! (we're trying to get the database we set up during development)
    - Click "connect" on the header
    - Scroll down to "Session pooler" and copy the connection string
    - Get your database password. If you don't know it, go to [Supabase Settings Database](https://supabase.com/dashboard/project/qekeiozbulopzzkmhrvm/settings/database) -> "Reset database password" and copy it
4. In the terminal, run this:
    ```bash
    npx supabase db dump --db-url <YOUR_CONNECTION_STRING> | npx sql-formatter -l postgresql > schema.sql
    ```
    This will create an SQL query to set up your entire database schema, functions, and so on.

5. Open the `schema.sql` file and copy all the contents
6. Go back to the Supabase Dashboard but this time, select your production project
7. Then go to the SQL editor, paste the SQL code you just copied and run it

If everything went well, your database should be set up and match your development database.

Remember, this only sets up the database. The auth settings, Supabase storage buckets, email templates and other stuff won't automatically be applied to your production project.

I'm not gonna assume you never changed a thing like email templates (you likely did) so instead of giving you some magical, step-by-step guide on everything you need to do, I'm just gonna give you a checklist or "reminder list" of things to do on your production project:

1. Add email templates
    - Your templates are here: [Supabase Email Templates](https://supabase.com/dashboard/project/_/auth/templates)
    - Just copy them from your dev project to production
2. Add redirect URLs in Supabase
   - Go [here](https://supabase.com/dashboard/project/_/auth/url-configuration)
   - Add these redirect URLs
      - `https://your-production-domain.com/api/auth/callback`
      - `https://your-production-domain.com/api/auth/confirm`
3. Syncing user email

   Same thing as earlier:
   - Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql/new)
   - Run this code:
   ```sql
   CREATE OR REPLACE FUNCTION public.update_user_email()
   RETURNS TRIGGER AS $$
   BEGIN
     -- Only update if email has changed
     IF NEW.email <> OLD.email THEN
       UPDATE public.users
       SET email = NEW.email
       WHERE id = NEW.id;
     END IF;
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   
   -- Trigger to call the function on UPDATE in auth.users
   CREATE OR REPLACE TRIGGER on_auth_user_updated
   AFTER UPDATE ON auth.users
   FOR EACH ROW
   EXECUTE FUNCTION public.update_user_email();
   ```
4. Enable any social providers and connect your production project to them
    > [!NOTE]
    > If you're not using any social providers, just skip this.
    
    **Google**
    - Go to [Supabase Auth Providers](https://supabase.com/dashboard/project/_/auth/providers)
    - Make sure your production project is selected
    - Enable Google
    - Add your "Client ID" and "Client Secret"
        - To get them, go to the [Google Cloud Console](https://console.cloud.google.com/)
        - Make sure the correct project is selected (the one you created earlier)
        - Go to "APIs and services"
        - Click "Credentials" in the sidebar
        - You should see the OAuth client you created. Click the edit icon on it
        - On the right, you should see your "Client ID" and "Client Secret"
    - Copy the Callback URL from Supabase (in the Supabase Google provider)
    - Click "Save changes" (so you don't forget)
    - In the Google Cloud Console, go back to "Credentials" (or "Clients") and click your OAuth client
    - Under "Authorized JavaScript origins", you should have:
        - `http://localhost:3000`
        - `https://your-production-domain.com` (add this)
    - And under "Authorized redirect URIs", you should have:
        - `https://your-dev-project-url.supabase.co/auth/v1/callback` (dev project)
        - `https://your-prod-project-url.supabase.co/auth/v1/callback` (production project, add this)
    
    **GitHub**
    - Navigate to [Supabase Auth Providers](https://supabase.com/dashboard/project/_/auth/providers)
    - Make sure your production project is selected
    - Expand "GitHub"
    - Enable the provider
    - Copy the "Callback URL"
    - Go to [GitHub OAuth Apps](https://github.com/settings/developers)
    - Click "New OAuth App"
    - For "Application name" enter your app's name
    - Enter your app domain for the homepage URL (eg: `https://mazeway.dev`)
    - Paste the "Callback URL" into the "Authorization callback URL" field
    - Click "Register application"
    - Copy your "Client ID" and generate a secret, then copy that too
    - Go back to the Supabase GitHub provider and paste the values

5. Add any Supabase storage buckets you might have (and upload any files you might need)
  - Go to [Supabase Storage](https://supabase.com/dashboard/project/_/storage/buckets)
  - Add anything you might need
  - If you set up user data exports, you'll want to create the same "exports" bucket
6. Connect your project to Resend
    > [!NOTE]
    > I'm gonna assume you already set up Resend.
    >
    > If you didn't, please go back to the "Get started" section and set it up for development (don't worry about production when setting it up). When you're done, come back here.
    - Go to [Resend Integrations](https://resend.com/settings/integrations)
    - Click "Revoke access" on Supabase if Resend has access
    - Now "Connect to Supabase" and authorize Resend
    - Select your Supabase production project
    - And your domain
    - Enter the sender name (like your app name, company name)
    - Click "Configure SMTP integration"
7. Set up automatic database cleanups
    - If you already set it up, the extension "pg_cron" will already be enabled
    - This is because when we dumped the database, it includes enabled extensions.
    - But your actual cron job won't be in your prod project
    - Run this in the [SQL Editor](https://supabase.com/dashboard/project/_/sql/new?skip=true):
    ```sql
    SELECT cron.schedule(
      'cleanup_database',         -- Job name
      '0 0 * * *',             -- Cron schedule for midnight
      $$ SELECT public.cleanup_expired_records(); $$
    );
    ```

### User data exports

If you didn't set up user data exports, just skip this.

In case you did, you'll need to:
1. Go to [Trigger.dev](https://cloud.trigger.dev/)
2. In the sidebar, go to "API keys"
3. Copy the "prod" key
4. Replace your environment variables (`.env.production`):
   ```diff
   - TRIGGER_API_KEY=your-trigger-api-key
   + TRIGGER_API_KEY=your-prod-trigger-api-key
   ```
5. Deploy Trigger.dev tasks
   - Run this in the terminal:
   ```bash
   npx trigger.dev@latest deploy
   ```

   Without this, user data exports won't work as the task can't be executed.

### 3. Deploy to Vercel

1. Go to Vercel and deploy as usual
2. When adding the environment variables, make sure to copy the contents of your `.env.production` environment variables and pasting them in Vercel (or any other deployment platform)
3. Also, you can delete the `.env.production` file now if you want. We only created it to track environment variables when setting up production. Totally up to you. Some people find it handy.

## Production checklist

1. Logo Setup
   - Upload your logo to Cloudinary (or your preferred CDN, but this one is cool)
     - Reason: We need the logo accessible everywhere (web app, emails, etc), not just in Next.js
     - Pro tip: Compress your image first at [Iloveimg.com](https://www.iloveimg.com/compress-image) (not an ad)
     - If you're gonna use Cloudinary, you just:
         - Go to [Cloudinary](https://console.cloudinary.com/console)
         - Click "Assets" in the sidebar
         - Then "Upload" in the top right corner
         - Go to "Assets". Your logo should appear. Right-click -> Copy URL -> Original
   - Update the logo URL in:
     - `emails/components/header.tsx`
     - `src/components/header.tsx`
     - Your email templates in the Supabase dashboard ([direct link](https://supabase.com/dashboard/project/_/auth/templates))
   - "When should I use the CDN vs the /public folder"
       - General thumb of rule:
       - Is it used ONLY in the Next.js app? -> /public
       - Is it used anywhere else OR needs transformation? -> CDN
       - OG images should be the /public folder because of same reasons:
           - They're page-specific
           - Only used in your Next.js app
           - For meta tags
           - You might later want different OG images for different pages
           - You don't need to transform them
2. Change branding color in emails
   - Even though you change the primary color in `src/app/globals.css`...
   - They're not applied to your email templates automatically
   - Double check the email templates in this project and the Supabase dashboard
3. Set up Resend
4. Set up Upstash Redis for API rate limiting
5. If you set up SMS for two-factor authentication:
   - Upgrade from Twilio trial account (add payment info)
   - Register for A2P 10DLC (that fancy thing for business texting)
   - Wait for carrier approval
   - Be ready for:
     - Per-message costs (~$0.0079 per SMS)
     - Monthly fees
     - Registration fees
     - Different rates per country
6. Enable "Enforce SSL on incoming connections" in Supabase:
   - [Database Settings](https://supabase.com/dashboard/project/_/settings/database)
7. Change email OPT expiration (see how in "Recommended for production")
8. Publish your Google OAuth app:
   - Go to [Google Cloud Console OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent?inv=1&invt=AbohWw)
   - Click the "Publish app" button to make it available to all users
9. Optional but good to have: set up automatic database cleanups
    - Not super urgent - your database won't explode
    - But good to do if you expect lots of users or long-term use
    - Check this [guide](docs/cleanup-setup.md)
10. Make allowed paths for image optimizations stricter
    - Update your `next.config.ts`:
    ```diff
    images: {
      remotePatterns: [
    +   // Replace with whatever CDN you're using
        {
          protocol: "https",
          hostname: "res.cloudinary.com",
          port: "",
    -     pathname: "/**",
    +     pathname: "/your-cloud-name/image/upload/**", // prevents anyone from using your image optimizations for their own assets
        },
      ],
    },
    ```
11. Set up user data exports
    - You only need this if you're gonna have EU users
    - Check out the guide [here](#setting-up-user-data-exports)

## Limitations

1. Security checks, logging, etc can be bypassed by calling Supabase APIs directly
   - This is a limitation with any app using Supabase
   - But an attacker could potentially do something like:
      - `supabase.auth.signOut()`
      - `supabase.auth.updateUser()`
      - `supabase.auth.signInWithPassword()`
      - And so on
   - You can't really control what happens during these events
   - Which means you can't add custom security checks
   - Like checking if they have a valid device session
   - Yes, Supabase does have something called "Auth hooks"
   - But it's only available on the ~~paid tier~~
   - But it's only available on the ~~paid tier~~
   - So instead of forcing devs into use it, I thought it'd be better to document it here
   - But to be fair, they don't have that many. Maybe 3 or 4. Not enough at all
   - If you're already on the ~~Pro tier~~, I recommend setting some Auth hooks up though!
   > Update:
   > 
   > So the Pro tier has like... 2 hooks
   >
   > And if you want 2 more hooks, you gotta get the team or enterprise plans
   >
   > For security?


## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
## Pro tips + note for Supabase

**Pro tip!** If you find yourself cloning this project a lot but changing same things, fork the repo, tweak what you need and clone your repo instead. That way, you can customize everything you want once and re-use whenever.

If anyone at Supabase is reading, a "fork" feature (like GitHub) would push this project even further into it's direction of making complete authentication more accessible. When a Supabase project is forked, it'd be like duplicating that project to another user.

## Who is behind this?

I'm Maze, a developer who used to hate authentication
> authentication is my only enemy - my old Twitter bio

That bio existed for a reason - nobody wants to build complete auth for every project, even when using great tools like Supabase. There's still a lot of code to write, edge cases to handle, and features to implement.

So I thought: "What if there was a starter pack that could just give me complete auth, problem solved?"

That's exactly what I built. If you hit any issues, open up a GitHub issue.

## Contributing

For anyone who wants to contribute, check out [CONTRIBUTING.md](CONTRIBUTING.md).