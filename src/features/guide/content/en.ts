import type { Manual } from './types';

/** Guides (English). Same section IDs and block structure as ja.ts */
export const manualsEn: Manual[] = [
  {
    id: 'user',
    title: 'User Guide',
    subtitle: 'Paying, topping up, sending money, splitting bills and coupons',
    sections: [
      {
        id: 'intro',
        title: 'Introduction',
        blocks: [
          {
            type: 'p',
            text: 'Any Pay is a demo of a QR code payment app. All balances are fictional and no real money ever moves.',
          },
          {
            type: 'p',
            text: 'Navigate with the five tabs at the bottom: Home, Pay, Send, History and More.',
          },
          {
            type: 'note',
            text: 'Switch the display language with the "日本語 | EN" toggle at the top right of the login and home screens, or under More → Language.',
          },
        ],
      },
      {
        id: 'login',
        title: 'Signing in',
        blocks: [
          {
            type: 'steps',
            items: [
              'On the login screen, choose the "Phone" tab.',
              'Enter your phone number and tap "Send code".',
              'Enter the 6-digit code you received and tap "Sign in".',
            ],
          },
          {
            type: 'note',
            text: 'No SMS is sent in the demo. Use a test number (e.g. 090-0000-0001) and the fixed code 123456.',
          },
          {
            type: 'p',
            text: 'The "ID & password" tab is for administrators and demo use. Regular users sign in with a phone number.',
          },
        ],
      },
      {
        id: 'onboarding',
        title: 'First-time setup (ID and display name)',
        blocks: [
          {
            type: 'p',
            text: 'The first time you sign in, you set your ID and display name.',
          },
          {
            type: 'list',
            items: [
              'ID: 3–20 lowercase letters, digits or underscores (_). It is used as a transfer address and in your receive QR, and cannot be changed later.',
              "Display name: the name shown on other people's screens and in notifications. You can change it later under More → Profile.",
            ],
          },
        ],
      },
      {
        id: 'home',
        title: 'The home screen',
        blocks: [
          {
            type: 'list',
            items: [
              'Balance: the amount you can spend right now.',
              'Points: your point balance. Tap it to open the points history.',
              'Top up: add funds to your balance.',
              'Pay: open the screen for showing or scanning a QR code.',
              'Recent activity: your last three transactions. "See all" opens the history.',
              'Bell (top right): shows the number of unread notifications.',
            ],
          },
        ],
      },
      {
        id: 'charge',
        title: 'Topping up',
        blocks: [
          {
            type: 'steps',
            items: [
              'Tap "Top up" on the home screen.',
              'Choose a method: bank account (direct debit) / credit card / convenience store / e-money. The provider (sandbox / Stripe test mode) is shown under each method.',
              'Enter the amount and tap "Continue with the provider" (or "Get a payment code" for convenience store).',
              'Review and approve on the provider page (direct-debit consent, card form or wallet approval).',
              'You return to the "Top-up status" screen in the app. Once the provider\'s confirmation arrives, it switches to the completion screen and your balance is credited.',
            ],
          },
          {
            type: 'list',
            items: [
              'Convenience store payments issue a payment code. Tap "Open the payment page" to pay on the terminal simulator.',
              'You can cancel before approving with "Cancel". If the provider declines, the status shows "Failed" and your balance is unchanged.',
              'The status updates automatically, and a "Topped up" notification arrives on completion.',
            ],
          },
          {
            type: 'table',
            headers: ['Item', 'Limit'],
            rows: [
              ['Per top-up', '¥1 – ¥100,000'],
              ['Balance', 'Up to ¥1,000,000'],
            ],
          },
          {
            type: 'note',
            text: 'Providers are a sandbox (simulated) or Stripe test mode. No real deposit takes place.',
          },
          {
            type: 'note',
            text: 'If the top-up API is unreachable, the method list shows "Demo · instant" and the balance is credited immediately.',
          },
        ],
      },
      {
        id: 'pay_overview',
        title: 'Paying at a store (three ways)',
        blocks: [
          {
            type: 'p',
            text: 'There are three ways to pay. Use the switch at the bottom of the Pay tab to choose between "Show QR" and "Scan".',
          },
          {
            type: 'list',
            items: [
              'Show QR: the store scans your QR code and enters the amount.',
              'Scan (QR on the register screen): scan the QR the store shows you. The amount is fixed and the code expires in 5 minutes.',
              'Scan (printed QR): scan the QR posted at the register and enter the amount yourself.',
            ],
          },
        ],
      },
      {
        id: 'pay_show',
        title: 'Paying by showing your QR',
        blocks: [
          {
            type: 'steps',
            items: [
              'Open the Pay tab. Your QR code is displayed.',
              'Show the screen to the store. The staff scan it and enter the amount.',
              'Once the store confirms, the screen switches to the completion page automatically (with a sound and vibration).',
            ],
          },
          {
            type: 'note',
            text: 'The QR refreshes every 60 seconds and becomes invalid after one use. The remaining time is shown as a bar, and "Refresh" creates a new code at any time.',
          },
        ],
      },
      {
        id: 'pay_scan',
        title: 'Paying by scanning the store QR',
        blocks: [
          {
            type: 'steps',
            items: [
              'On the Pay tab, choose "Scan".',
              'Point the camera at the store QR (register screen or printed).',
              'Check the store name and amount on the confirmation screen. For a printed QR, enter the amount.',
              'If you have a coupon, choose it under "Use a coupon". The discounted amount and your balance after payment are shown.',
              'If you have set a PIN, verify with your PIN (or biometrics).',
              'Tap "Pay" to see the completion screen.',
            ],
          },
          {
            type: 'list',
            items: [
              'A register-screen QR expires after 5 minutes. Ask the store for a new one if it has expired.',
              "Scanning with your phone's built-in camera also opens the Any Pay confirmation screen.",
              'After paying, you can check the details in History and Notifications.',
            ],
          },
          {
            type: 'note',
            text: 'If the camera is unavailable, you can paste the QR contents (a string starting with ap1:) to read it (demo only).',
          },
        ],
      },
      {
        id: 'coupons',
        title: 'Coupons and points',
        blocks: [
          {
            type: 'steps',
            items: [
              'Open More → Coupons and claim coupons on the "Get coupons" tab.',
              'On the payment confirmation screen, choose one under "Use a coupon".',
              'The discounted amount and your balance after payment are shown immediately.',
            ],
          },
          {
            type: 'list',
            items: [
              'Store coupons work only at that store; all-store coupons work anywhere.',
              'A coupon cannot be selected if the minimum amount is not met.',
              'A used coupon becomes available again if that payment is refunded.',
            ],
          },
          {
            type: 'p',
            text: 'You earn 0.5% of the paid amount (after discount) in points, rounded down. Points are revoked on refund. Paying with points is not supported in this demo.',
          },
        ],
      },
      {
        id: 'send',
        title: 'Sending money',
        blocks: [
          {
            type: 'steps',
            items: [
              "On the Send tab, type the recipient's ID (suggestions appear as you type). You can also scan their receive QR.",
              'Enter the amount and an optional message (up to 100 characters).',
              'Check the recipient and amount on the confirmation screen. If you have set a PIN, verify it.',
              'Tap "Send" to finish. The recipient is notified.',
            ],
          },
          {
            type: 'table',
            headers: ['Item', 'Detail'],
            rows: [
              ['Per transfer', '¥1 – ¥50,000'],
              ['To yourself', 'Not allowed'],
            ],
          },
        ],
      },
      {
        id: 'receive',
        title: 'Receiving money',
        blocks: [
          {
            type: 'steps',
            items: [
              'On the Send tab, tap "Receive".',
              'Have the sender scan your receive QR, or share your ID with "Copy ID" or "Share link".',
            ],
          },
          {
            type: 'p',
            text: 'Received transfers appear in Notifications and History. Your balance is updated immediately.',
          },
        ],
      },
      {
        id: 'split',
        title: 'Splitting a bill',
        blocks: [
          {
            type: 'steps',
            items: [
              'On the Send tab, open "Split bill" and tap "New".',
              'Enter the total amount and an optional memo.',
              'Tap "Add member" and search by ID to add people.',
              'Tap "Split evenly" to divide the total (any remainder goes to the first members, ¥1 each). You can adjust each amount.',
              'Tap "Create" to notify every member.',
            ],
          },
          {
            type: 'list',
            items: [
              'Members pay their share from the notification or the Split bill screen (with PIN verification, like a transfer).',
              'The creator can see who has paid in the list. It is marked complete once everyone has paid.',
              'Each share can be up to ¥50,000.',
            ],
          },
        ],
      },
      {
        id: 'history',
        title: 'History and details',
        blocks: [
          {
            type: 'list',
            items: [
              'Transactions are grouped by month. Use ← → at the top to change month.',
              'Filter by type (Top up / Payment / Transfer / Withdrawal / Refund / Split).',
              'Tap an item for details: balance after the transaction, payment method, store, coupon discount, points and transaction ID.',
              'Refunded payments are shown struck through with a link to the refund transaction.',
            ],
          },
        ],
      },
      {
        id: 'notifications',
        title: 'Notifications',
        blocks: [
          {
            type: 'p',
            text: 'Notifications for payments, transfers, splits and refunds arrive in real time and pop up at the top of the screen. Open More → Notifications to see the list; opening it marks them read, and "Mark read" clears them all.',
          },
        ],
      },
      {
        id: 'security',
        title: 'Security (PIN and biometrics)',
        blocks: [
          {
            type: 'steps',
            items: [
              'Open More → Security and tap "Payment PIN".',
              'Enter a 4–6 digit number twice to set it.',
            ],
          },
          {
            type: 'list',
            items: [
              'Once a PIN is set, you must enter it before payments, transfers and split payments (no re-entry needed for 5 minutes after a successful check).',
              'Five wrong attempts in a row lock the PIN for 10 minutes.',
              'Changing the PIN requires the current PIN.',
              "Turning on biometrics (Face ID / Touch ID) lets you use the device's authentication instead of the PIN on supported devices.",
            ],
          },
          {
            type: 'note',
            tone: 'warn',
            text: 'Biometrics only re-authenticate you on the device and are not used for server-side authorization. The PIN is verified on the server.',
          },
        ],
      },
      {
        id: 'withdraw',
        title: 'Withdrawing',
        blocks: [
          {
            type: 'steps',
            items: ['Open More → Withdraw.', 'Enter the amount and tap "Withdraw".'],
          },
          {
            type: 'p',
            text: 'You can withdraw up to your balance. The fee is ¥0 in the demo and no real bank transfer takes place.',
          },
        ],
      },
      {
        id: 'settings',
        title: 'Profile and other settings',
        blocks: [
          {
            type: 'list',
            items: [
              'Profile: change your display name.',
              'Language: switch between 日本語 and English.',
              'Register a store: register if you want to accept payments as a store (see the Merchant Guide).',
              'Sign out: sign out on this device.',
            ],
          },
        ],
      },
      {
        id: 'errors',
        title: 'If you see an error',
        blocks: [
          {
            type: 'table',
            headers: ['Message', 'Cause and what to do'],
            rows: [
              ['Insufficient balance', 'Top up and try again.'],
              ['The QR code has expired', 'Reopen the Pay screen and show the new QR.'],
              ['This QR code has already been used', 'A QR works once. Show a new one.'],
              ['The payment request has expired', 'Ask the store to show a new QR.'],
              ['Limit exceeded', 'Check the per-transaction or balance limit.'],
              ['PIN is locked', 'Wait 10 minutes and try again.'],
              [
                'Too many payments in a short time',
                'The limit is 20 payments per minute. Wait a moment and try again.',
              ],
              ['PIN verification required', 'Enter your PIN and try again.'],
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'merchant',
    title: 'Merchant Guide',
    subtitle: 'From store registration to accepting payments, refunds, coupons and withdrawals',
    sections: [
      {
        id: 'intro',
        title: 'Introduction',
        blocks: [
          {
            type: 'p',
            text: 'Merchant features become available once you register a store on your user account. One store per account, with no review process (demo).',
          },
          {
            type: 'p',
            text: 'Store sales go into a dedicated store balance, kept separate from your personal balance.',
          },
        ],
      },
      {
        id: 'register',
        title: 'Registering a store',
        blocks: [
          {
            type: 'steps',
            items: [
              'Open More → Register a store.',
              'Enter the store name (required) and optionally a category and address.',
              'Tap "Register". From then on, "Merchant dashboard" appears under More.',
            ],
          },
        ],
      },
      {
        id: 'dashboard',
        title: 'Merchant dashboard layout',
        blocks: [
          {
            type: 'list',
            items: [
              "Home: today's sales, count and refunds, store balance, recent payments.",
              "Checkout: accept a payment (show a QR / scan the customer's QR).",
              'Payments: list, details and refunds.',
              'QR: the printable static QR.',
              'Coupons: create and delete store coupons.',
              'Withdraw: withdraw from the store balance.',
            ],
          },
          {
            type: 'p',
            text: 'The ← at the top left returns to the customer-side app.',
          },
        ],
      },
      {
        id: 'home',
        title: 'Store home',
        blocks: [
          {
            type: 'list',
            items: [
              "Today's sales are totalled from midnight Japan time and shown net of refunds.",
              'When a customer pays, the payment is added to "Recent payments" immediately with a sound, vibration and pop-up.',
              '"Accept a payment" opens the checkout screen.',
            ],
          },
        ],
      },
      {
        id: 'accept_dynamic',
        title: 'Checkout ①: Show a QR (register-screen QR)',
        blocks: [
          {
            type: 'steps',
            items: [
              'On Checkout, choose "Show QR".',
              "Enter the amount (quick buttons available). The memo is optional and is shown on the customer's confirmation screen.",
              'Tap "Show QR code" to display the code.',
              'The customer scans it with "Scan" in Any Pay, confirms and pays.',
              'Once paid, the screen switches to the completed state automatically.',
            ],
          },
          {
            type: 'list',
            items: [
              'The QR expires after 5 minutes. You can also cancel it earlier with "Cancel".',
              'The same QR cannot be paid twice.',
              'The amount is fixed in the QR and cannot be changed by the customer.',
            ],
          },
        ],
      },
      {
        id: 'accept_scan',
        title: "Checkout ②: Scan the customer's QR",
        blocks: [
          {
            type: 'steps',
            items: [
              'On Checkout, choose "Scan customer QR".',
              "Scan the QR on the customer's Pay screen with the camera.",
              'Enter the amount and tap "Charge".',
              "The customer's screen switches to the completion page automatically.",
            ],
          },
          {
            type: 'list',
            items: [
              "The customer's QR expires after 60 seconds and is single-use. If it has expired or been used, ask for a new one.",
              "If the customer's balance is insufficient, no payment is made and the QR is not consumed (no need to show it again).",
              'Coupons are not applied with this method.',
            ],
          },
        ],
      },
      {
        id: 'accept_static',
        title: 'Checkout ③: Printed QR',
        blocks: [
          {
            type: 'steps',
            items: [
              'On the QR tab, tap "Print (A4)" to print a sheet with your store name.',
              'Post it at the register.',
              'Customers scan it with their phone camera or "Scan" in Any Pay, enter the amount and pay.',
            ],
          },
          {
            type: 'p',
            text: 'Payments appear on the store home immediately. Since the customer enters the amount, check it at the register.',
          },
        ],
      },
      {
        id: 'transactions',
        title: 'Payment list and details',
        blocks: [
          {
            type: 'list',
            items: [
              'The Payments tab lists payments by month. Use ← → to change month.',
              'Details show the payer, payment method (customer QR / store QR / printed QR), coupon discount breakdown, points granted and transaction ID.',
              'Refunded payments are shown struck through.',
            ],
          },
        ],
      },
      {
        id: 'refund',
        title: 'Refunds',
        blocks: [
          {
            type: 'steps',
            items: ['Open the payment under Payments.', 'Tap "Refund in full" and confirm.'],
          },
          {
            type: 'list',
            items: [
              'Only full refunds are supported (no partial refunds).',
              'Refunds come out of the store balance, so a refund fails if the store balance is insufficient. Be careful not to withdraw too much.',
              'Points granted to the customer are revoked and any coupon they used becomes available again.',
              'The original payment is marked "Refunded" and cannot be refunded twice.',
            ],
          },
        ],
      },
      {
        id: 'coupons',
        title: 'Creating coupons',
        blocks: [
          {
            type: 'steps',
            items: [
              'On the Coupons tab, tap "Create a coupon".',
              'Enter a title (up to 40 characters), the discount type (fixed / percent), the amount or rate, a minimum purchase amount, validity in days (1–365) and an optional claim limit.',
              'Tap "Create".',
            ],
          },
          {
            type: 'list',
            items: [
              'Created coupons appear under Coupons → Get coupons for customers.',
              'The discount is borne by the store (you receive the discounted amount).',
              'All-store coupons can only be created by an administrator.',
              'Deleting a coupon stops new claims; already-claimed coupons are unaffected.',
            ],
          },
        ],
      },
      {
        id: 'withdraw',
        title: 'Withdrawing',
        blocks: [
          {
            type: 'steps',
            items: ['Open the Withdraw tab.', 'Enter the amount and tap "Withdraw".'],
          },
          {
            type: 'p',
            text: 'You can withdraw up to the store balance. The fee is ¥0 in the demo and no real bank transfer takes place. We recommend keeping some balance for refunds.',
          },
        ],
      },
      {
        id: 'limits',
        title: 'Limits',
        blocks: [
          {
            type: 'table',
            headers: ['Item', 'Detail'],
            rows: [
              ['Register-screen QR validity', '5 minutes'],
              ['Customer QR validity', '60 seconds, single use'],
              ['Customer payment rate', 'Up to 20 per minute'],
              ['Stores per account', '1'],
              ['Refunds', 'Full amount only, within the store balance'],
              ['Fees', '¥0 (demo)'],
            ],
          },
        ],
      },
      {
        id: 'errors',
        title: 'If you see an error',
        blocks: [
          {
            type: 'table',
            headers: ['Message', 'Cause and what to do'],
            rows: [
              ['The QR code has expired', 'Ask the customer to reopen their Pay screen.'],
              ['This QR code has already been used', 'Ask the customer to show a new QR.'],
              [
                'Insufficient balance (when charging)',
                "The customer's balance is too low. Try again after they top up.",
              ],
              [
                'Insufficient balance (when refunding)',
                'The store balance is too low. Hold off on withdrawals or wait for more sales.',
              ],
              [
                'You are not allowed to operate this store',
                "Sign in with the store owner's account.",
              ],
              ['Already refunded', 'A payment cannot be refunded twice.'],
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'admin',
    title: 'Administrator Guide',
    subtitle: 'Ledger reconciliation, demo data, deployment and operations',
    sections: [
      {
        id: 'intro',
        title: 'Introduction',
        blocks: [
          {
            type: 'p',
            text: 'Administrators (role = admin) have access to operational features such as the ledger integrity check. Admin rights cannot be granted from the app; they are set in the database (seed or SQL).',
          },
          {
            type: 'list',
            items: [
              'Demo administrator: on the login screen, choose the "ID & password" tab and enter the ID "kuro" with the password.',
              'The seeded @alice (090-0000-0001 / code 123456) is also an administrator.',
            ],
          },
          {
            type: 'note',
            tone: 'warn',
            text: 'The password is not stored in the repository (only a bcrypt hash). Keep it safe.',
          },
        ],
      },
      {
        id: 'reconcile',
        title: 'Ledger reconciliation',
        blocks: [
          {
            type: 'steps',
            items: [
              'Open More → Ledger reconciliation (admin).',
              'The check runs automatically and shows statistics (wallets, transactions, ledger rows, ledger total) and a list of mismatches.',
              'Tap "Re-run" to check again at any time.',
            ],
          },
          {
            type: 'p',
            text: 'It compares each wallet\'s cached balance (balance_cache) with the sum of its ledger entries. Because of double-entry bookkeeping, the ledger always sums to 0 and "treasury balance + total user and merchant balances = 0" always holds.',
          },
          {
            type: 'list',
            items: [
              "If there is a mismatch: balances are only ever updated inside RPCs, so suspect a direct UPDATE or a bug. Inspect that wallet's ledger_entries with SQL.",
              'To fix it, treat the ledger as the source of truth and recompute balance_cache. The ledger is append-only and is never edited.',
            ],
          },
        ],
      },
      {
        id: 'coupons',
        title: 'Creating all-store coupons',
        blocks: [
          {
            type: 'p',
            text: 'Coupons valid at every store (merchant_id NULL) can only be created by an administrator and have no UI in the app. Create them from the Supabase SQL Editor.',
          },
          {
            type: 'steps',
            items: [
              'Open the SQL Editor in the Supabase dashboard.',
              'INSERT into the coupons table with merchant_id = null, title, discount_type (fixed / percent), value, min_amount, valid_until and an optional max_uses.',
            ],
          },
          {
            type: 'note',
            text: 'The discount from an all-store coupon is subsidised by the treasury (the merchant receives the full pre-discount amount).',
          },
        ],
      },
      {
        id: 'accounts',
        title: 'Demo accounts and data',
        blocks: [
          {
            type: 'table',
            headers: ['Phone / ID', 'Role'],
            rows: [
              ['090-0000-0001 / @alice', 'User (also administrator)'],
              ['090-0000-0002 / @bob', 'User'],
              ['090-0000-0003 / @carol', 'User'],
              ['090-0000-0011 / @yuki_coffee', 'Owner of "Any Coffee 渋谷店"'],
              ['090-0000-0012 / @ren_books', 'Owner of "Book & Bean 神保町"'],
              ['ID kuro (ID & password)', 'Administrator'],
            ],
          },
          {
            type: 'p',
            text: 'The verification code is 123456 for every account (Supabase Auth Test OTP).',
          },
          {
            type: 'list',
            items: [
              'Loading demo data: run the "Supabase deploy" GitHub Actions workflow manually with the seed option enabled.',
              'The seed assumes an empty database. Watch for duplicates if data already exists.',
            ],
          },
        ],
      },
      {
        id: 'users',
        title: 'Managing users and stores',
        blocks: [
          {
            type: 'list',
            items: [
              'User list: Supabase dashboard → Authentication → Users.',
              'Profiles and stores: the profiles / merchants tables in the Table Editor.',
              'Changing a role: update profiles.role with SQL (it cannot be changed from the app).',
              'Adding a test phone number: add it to test_otp in supabase/config.toml and push; the Actions workflow applies it.',
            ],
          },
        ],
      },
      {
        id: 'deploy',
        title: 'Deployment and operations',
        blocks: [
          {
            type: 'list',
            items: [
              'Frontend: pushing to the branch triggers an automatic Cloudflare Pages build and deploy.',
              'Database and Edge Functions: pushing changes under supabase/ runs the "Supabase deploy" workflow, which applies migrations, auth config and the Edge Functions (top-up API).',
              'CI: type check, lint, Vitest, SQL tests and the build run automatically.',
              'Migrations are added as new files only; existing files are never edited.',
              'Environment variables: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Cloudflare Pages.',
            ],
          },
        ],
      },
      {
        id: 'security',
        title: 'Security policy',
        blocks: [
          {
            type: 'list',
            items: [
              'RLS is enabled on every table. Clients cannot write to the money tables (wallets / transactions / ledger_entries / point_entries).',
              'Balances are only updated inside security definer RPCs. The ledger is append-only (no UPDATE / DELETE).',
              'Only the anon key is shipped to the frontend. The service_role key is used only in Edge Functions (Stripe webhook).',
              'PINs are verified on the server with bcrypt. Five failures lock the PIN for 10 minutes.',
              'One-time QRs last 60 seconds and are single-use; register-screen QRs expire after 5 minutes.',
            ],
          },
        ],
      },
      {
        id: 'limits',
        title: 'Configured limits',
        blocks: [
          {
            type: 'table',
            headers: ['Item', 'Value'],
            rows: [
              ['Top up', '¥1 – ¥100,000 per top-up'],
              ['Balance cap', '¥1,000,000'],
              ['Transfer', '¥1 – ¥50,000 per transfer'],
              ['Split bill', 'Up to ¥50,000 per person'],
              ['Payment rate', '20 per minute'],
              ['Points', '0.5% of the paid amount (after discount), rounded down'],
              [
                'PIN',
                '4–6 digits. 10-minute lock after 5 failures. Verification valid for 5 minutes',
              ],
              ['Memo', 'Up to 100 characters'],
            ],
          },
        ],
      },
      {
        id: 'gateway',
        title: 'Operating the top-up API (Charge Gateway)',
        blocks: [
          {
            type: 'p',
            text: 'Top-ups flow as request → approval on the provider → confirmation → balance credited. The bundled sandbox (simulated provider) and Stripe test mode are available. For the technical specification see the payment-provider spec under docs/spec.',
          },
          {
            type: 'list',
            items: [
              'What users see: the method list on the top-up screen is built automatically from the configured providers (sandbox / Stripe). If the API is unreachable it falls back to "Demo · instant".',
              'Secrets: SANDBOX_API_KEY / SANDBOX_WEBHOOK_SECRET are generated automatically by the Actions workflow on first deploy. APP_ORIGIN can be overridden as a repository variable. For Stripe, add STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET as GitHub Secrets.',
              'Deployment: pushing changes under supabase/ runs the "Supabase deploy" workflow, which sets the secrets and deploys all four functions every time.',
              "Inspecting state: the charge_requests table in the Table Editor (RLS hides other users' rows; admins use the SQL Editor). provider_ref is the provider-side ID and failure_code the failure reason.",
              'Webhook redelivery: multiple confirmations for the same request still produce one transaction. Try "Resend webhook" on the sandbox result page.',
            ],
          },
          {
            type: 'table',
            headers: ['Status', 'Meaning'],
            rows: [
              ['pending', 'Awaiting provider approval. The user can cancel'],
              ['processing', 'Being processed by the provider (e.g. awaiting a store payment)'],
              ['completed', 'Posted to the ledger; transaction_id holds the transaction'],
              [
                'failed',
                'Declined by the provider, or could not be posted (e.g. balance cap). Balance unchanged',
              ],
              ['cancelled', 'Cancelled by the user or the provider'],
              ['expired', 'Expired. A payment confirmation arriving afterwards is still posted'],
            ],
          },
          {
            type: 'note',
            tone: 'warn',
            text: 'Posting happens only after the webhook signature is verified, never from the app\'s "success" return. Failed requests never affect the balance.',
          },
        ],
      },
      {
        id: 'stripe',
        title: 'Stripe test payments (optional)',
        blocks: [
          {
            type: 'steps',
            items: [
              'Get an API key and webhook signing secret from a Stripe test account.',
              'Add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET as GitHub Secrets.',
              'Push a change under supabase/ or run the "Supabase deploy" workflow; it registers the secrets and deploys the functions.',
              'Register a webhook endpoint in Stripe (https://<ref>.supabase.co/functions/v1/charge-webhook/stripe, events checkout.session.completed / async_payment_succeeded / async_payment_failed / expired).',
              'The top-up method list now shows card / convenience store / PayPay under "Stripe test mode".',
            ],
          },
          {
            type: 'p',
            text: "Redelivered webhooks are not double-counted thanks to the Checkout Session ID and the request's idempotency key.",
          },
        ],
      },
      {
        id: 'troubleshooting',
        title: 'Known issues and fixes',
        blocks: [
          {
            type: 'table',
            headers: ['Symptom', 'Fix'],
            rows: [
              [
                '"Failed to load user information" at login',
                'Happens when rows inserted directly into auth.users have NULL token columns. Fixed by migration 0009; if it recurs, set those columns to an empty string.',
              ],
              [
                'Payments do not appear on the store home',
                'Check that transactions / notifications / payment_requests are included in the Supabase Realtime publication.',
              ],
              ['Mismatch in ledger reconciliation', 'See "Ledger reconciliation" above.'],
              [
                'Cannot sign in with a Test OTP',
                'Check that the number (with country code, e.g. 819000000001) and code are registered under Authentication → Phone → Test OTPs.',
              ],
            ],
          },
        ],
      },
    ],
  },
];
