// ============================================
// COMMON TYPES & INTERFACES
// ============================================

interface OTPEmailOptions {
  otp: string;
  validityMinutes?: number;
}

interface WelcomeEmailOptions {
  name: string;
  email: string;
}

interface PasswordResetEmailOptions {
  otp: string;
  validityMinutes?: number;
}

interface TwoFactorEmailOptions {
  otp: string;
  validityMinutes?: number;
}

interface PasswordChangedEmailOptions {
  name?: string;
}

interface AccountBlockedEmailOptions {
  blockedMinutes: number;
}

// ============================================
// BASE EMAIL STYLES (Reusable)
// ============================================

const getBaseEmailStyles = () => `
  body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background-color: #f5f5f5;
  }
  .email-container {
    max-width: 600px;
    margin: 0 auto;
    background-color: #ffffff;
  }
  .header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 40px 20px;
    text-align: center;
  }
  .header h1 {
    margin: 0;
    color: #ffffff;
    font-size: 28px;
    font-weight: 600;
  }
  .content {
    padding: 40px 30px;
  }
  .greeting {
    font-size: 16px;
    color: #333333;
    margin-bottom: 20px;
    line-height: 1.5;
  }
  .otp-container {
    background-color: #f8f9fa;
    border: 2px dashed #667eea;
    border-radius: 12px;
    padding: 30px;
    text-align: center;
    margin: 30px 0;
  }
  .otp-label {
    font-size: 14px;
    color: #666666;
    margin-bottom: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 600;
  }
  .otp-code {
    font-size: 42px;
    font-weight: 700;
    color: #667eea;
    letter-spacing: 8px;
    font-family: 'Courier New', monospace;
    margin: 10px 0;
  }
  .validity {
    font-size: 14px;
    color: #666666;
    margin-top: 15px;
  }
  .warning {
    background-color: #fff3cd;
    border-left: 4px solid #ffc107;
    padding: 15px 20px;
    margin: 25px 0;
    border-radius: 4px;
  }
  .info {
    background-color: #d1ecf1;
    border-left: 4px solid #17a2b8;
    padding: 15px 20px;
    margin: 25px 0;
    border-radius: 4px;
  }
  .success {
    background-color: #d4edda;
    border-left: 4px solid #28a745;
    padding: 15px 20px;
    margin: 25px 0;
    border-radius: 4px;
  }
  .danger {
    background-color: #f8d7da;
    border-left: 4px solid #dc3545;
    padding: 15px 20px;
    margin: 25px 0;
    border-radius: 4px;
  }
  .alert-icon {
    display: inline-block;
    font-size: 20px;
    margin-right: 8px;
    vertical-align: middle;
  }
  .alert-text {
    display: inline-block;
    font-size: 14px;
    margin: 0;
    vertical-align: middle;
  }
  .footer {
    background-color: #f8f9fa;
    padding: 30px;
    text-align: center;
    border-top: 1px solid #e9ecef;
  }
  .footer-text {
    font-size: 13px;
    color: #6c757d;
    margin: 5px 0;
    line-height: 1.6;
  }
  .divider {
    height: 1px;
    background-color: #e9ecef;
    margin: 25px 0;
  }
  .button {
    display: inline-block;
    padding: 12px 30px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #ffffff;
    text-decoration: none;
    border-radius: 6px;
    font-weight: 600;
    margin: 20px 0;
  }
  @media only screen and (max-width: 600px) {
    .content {
      padding: 30px 20px;
    }
    .otp-code {
      font-size: 36px;
      letter-spacing: 6px;
    }
  }
`;

// ============================================
// 1. EMAIL VERIFICATION OTP
// ============================================

export function generateOTPEmailText({
  otp,
  validityMinutes = 10,
}: OTPEmailOptions): string {
  return `Your OTP for verification is ${otp}. This OTP is valid for ${validityMinutes} minutes. Do not share this OTP with anyone.`;
}

export function generateOTPEmailHTML({
  otp,
  validityMinutes = 10,
}: OTPEmailOptions): string {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verification OTP</title>
    <style>${getBaseEmailStyles()}</style>
  </head>
  <body>
    <div class="email-container">
      <div class="header">
        <h1>🔐 Verification Code</h1>
      </div>
      
      <div class="content">
        <p class="greeting">Hello,</p>
        
        <p class="greeting">
          We received a request to verify your account. Please use the One-Time Password (OTP) below to complete your verification:
        </p>
        
        <div class="otp-container">
          <div class="otp-label">Your OTP Code</div>
          <div class="otp-code">${otp}</div>
          <div class="validity">⏱️ Valid for ${validityMinutes} minutes</div>
        </div>
        
        <div class="warning">
          <span class="alert-icon">⚠️</span>
          <p class="alert-text">
            <strong>Security Notice:</strong> Never share this OTP with anyone. Our team will never ask for your OTP via email, phone, or any other means.
          </p>
        </div>
        
        <div class="divider"></div>
        
        <p class="greeting">
          If you didn't request this verification code, please ignore this email or contact our support team if you have concerns about your account security.
        </p>
      </div>
      
      <div class="footer">
        <p class="footer-text">This is an automated message, please do not reply to this email.</p>
        <p class="footer-text">© ${new Date().getFullYear()} SeatWaves. All rights reserved.</p>
      </div>
    </div>
  </body>
  </html>
    `.trim();
}

// ============================================
// 2. TWO-FACTOR AUTHENTICATION (2FA) OTP
// ============================================

export function generateTwoFactorEmailText({
  otp,
  validityMinutes = 10,
}: TwoFactorEmailOptions): string {
  return `Your Two-Factor Authentication code is ${otp}. This code is valid for ${validityMinutes} minutes. Do not share this code with anyone.`;
}

export function generateTwoFactorEmailHTML({
  otp,
  validityMinutes = 10,
}: TwoFactorEmailOptions): string {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Two-Factor Authentication</title>
    <style>${getBaseEmailStyles()}</style>
  </head>
  <body>
    <div class="email-container">
      <div class="header">
        <h1>🔒 Two-Factor Authentication</h1>
      </div>
      
      <div class="content">
        <p class="greeting">Hello,</p>
        
        <p class="greeting">
          A login attempt was detected on your account. To complete the sign-in process, please enter the verification code below:
        </p>
        
        <div class="otp-container">
          <div class="otp-label">Your 2FA Code</div>
          <div class="otp-code">${otp}</div>
          <div class="validity">⏱️ Valid for ${validityMinutes} minutes</div>
        </div>
        
        <div class="info">
          <span class="alert-icon">ℹ️</span>
          <p class="alert-text">
            <strong>Security Tip:</strong> Two-factor authentication adds an extra layer of security to your account. Keep this code confidential.
          </p>
        </div>
        
        <div class="divider"></div>
        
        <p class="greeting">
          If you didn't attempt to log in, please secure your account immediately by changing your password and contacting our support team.
        </p>
      </div>
      
      <div class="footer">
        <p class="footer-text">This is an automated message, please do not reply to this email.</p>
        <p class="footer-text">© ${new Date().getFullYear()} SeatWaves. All rights reserved.</p>
      </div>
    </div>
  </body>
  </html>
    `.trim();
}

// ============================================
// 3. PASSWORD RESET OTP
// ============================================

export function generatePasswordResetEmailText({
  otp,
  validityMinutes = 10,
}: PasswordResetEmailOptions): string {
  return `Your password reset code is ${otp}. This code is valid for ${validityMinutes} minutes. If you didn't request a password reset, please ignore this email.`;
}

export function generatePasswordResetEmailHTML({
  otp,
  validityMinutes = 10,
}: PasswordResetEmailOptions): string {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset</title>
    <style>${getBaseEmailStyles()}</style>
  </head>
  <body>
    <div class="email-container">
      <div class="header">
        <h1>🔑 Password Reset Request</h1>
      </div>
      
      <div class="content">
        <p class="greeting">Hello,</p>
        
        <p class="greeting">
          We received a request to reset your password. Use the verification code below to proceed with resetting your password:
        </p>
        
        <div class="otp-container">
          <div class="otp-label">Password Reset Code</div>
          <div class="otp-code">${otp}</div>
          <div class="validity">⏱️ Valid for ${validityMinutes} minutes</div>
        </div>
        
        <div class="warning">
          <span class="alert-icon">⚠️</span>
          <p class="alert-text">
            <strong>Important:</strong> If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
          </p>
        </div>
        
        <div class="divider"></div>
        
        <p class="greeting">
          For security reasons, this code will expire in ${validityMinutes} minutes. If you need a new code, you can request another password reset.
        </p>
      </div>
      
      <div class="footer">
        <p class="footer-text">This is an automated message, please do not reply to this email.</p>
        <p class="footer-text">© ${new Date().getFullYear()} SeatWaves. All rights reserved.</p>
      </div>
    </div>
  </body>
  </html>
    `.trim();
}

// ============================================
// 4. WELCOME EMAIL (After Registration)
// ============================================

export function generateWelcomeEmailText({
  name,
  email,
}: WelcomeEmailOptions): string {
  return `Welcome to SeatWaves, ${name}! Your account has been successfully created with email: ${email}. Start exploring amazing events and experiences today!`;
}

export function generateWelcomeEmailHTML({
  name,
  email,
}: WelcomeEmailOptions): string {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to SeatWaves</title>
    <style>${getBaseEmailStyles()}</style>
  </head>
  <body>
    <div class="email-container">
      <div class="header">
        <h1>🎉 Welcome to SeatWaves!</h1>
      </div>
      
      <div class="content">
        <p class="greeting">Hello ${name},</p>
        
        <p class="greeting">
          Thank you for joining SeatWaves! We're excited to have you on board. Your account has been successfully created.
        </p>
        
        <div class="success">
          <span class="alert-icon">✅</span>
          <p class="alert-text">
            <strong>Account Created:</strong> ${email}
          </p>
        </div>
        
        <p class="greeting">
          You can now explore and book tickets for amazing events, concerts, sports, and more. Start your journey with us today!
        </p>
        
        <div class="divider"></div>
        
        <p class="greeting">
          If you have any questions or need assistance, our support team is always here to help.
        </p>
      </div>
      
      <div class="footer">
        <p class="footer-text">This is an automated message, please do not reply to this email.</p>
        <p class="footer-text">© ${new Date().getFullYear()} SeatWaves. All rights reserved.</p>
      </div>
    </div>
  </body>
  </html>
    `.trim();
}

// ============================================
// 5. PASSWORD CHANGED CONFIRMATION
// ============================================

export function generatePasswordChangedEmailText({
  name,
}: PasswordChangedEmailOptions): string {
  const greeting = name ? `Hello ${name}` : 'Hello';
  return `${greeting}, Your password has been successfully changed. If you didn't make this change, please contact our support team immediately.`;
}

export function generatePasswordChangedEmailHTML({
  name,
}: PasswordChangedEmailOptions): string {
  const greeting = name ? `Hello ${name}` : 'Hello';
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Changed</title>
    <style>${getBaseEmailStyles()}</style>
  </head>
  <body>
    <div class="email-container">
      <div class="header">
        <h1>🔐 Password Changed Successfully</h1>
      </div>
      
      <div class="content">
        <p class="greeting">${greeting},</p>
        
        <p class="greeting">
          This email confirms that your password has been successfully changed.
        </p>
        
        <div class="success">
          <span class="alert-icon">✅</span>
          <p class="alert-text">
            <strong>Password Updated:</strong> ${new Date().toLocaleString()}
          </p>
        </div>
        
        <div class="warning">
          <span class="alert-icon">⚠️</span>
          <p class="alert-text">
            <strong>Didn't make this change?</strong> If you didn't change your password, please contact our support team immediately to secure your account.
          </p>
        </div>
        
        <div class="divider"></div>
        
        <p class="greeting">
          For your security, we recommend using a strong, unique password and enabling two-factor authentication.
        </p>
      </div>
      
      <div class="footer">
        <p class="footer-text">This is an automated message, please do not reply to this email.</p>
        <p class="footer-text">© ${new Date().getFullYear()} SeatWaves. All rights reserved.</p>
      </div>
    </div>
  </body>
  </html>
    `.trim();
}

// ============================================
// 6. ACCOUNT BLOCKED NOTIFICATION
// ============================================

export function generateAccountBlockedEmailText({
  blockedMinutes,
}: AccountBlockedEmailOptions): string {
  return `Your account has been temporarily blocked due to multiple failed login attempts. Please try again in ${blockedMinutes} minutes.`;
}

export function generateAccountBlockedEmailHTML({
  blockedMinutes,
}: AccountBlockedEmailOptions): string {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Temporarily Blocked</title>
    <style>${getBaseEmailStyles()}</style>
  </head>
  <body>
    <div class="email-container">
      <div class="header">
        <h1>🚫 Account Temporarily Blocked</h1>
      </div>
      
      <div class="content">
        <p class="greeting">Hello,</p>
        
        <p class="greeting">
          Your account has been temporarily blocked due to multiple failed login attempts.
        </p>
        
        <div class="danger">
          <span class="alert-icon">🔒</span>
          <p class="alert-text">
            <strong>Account Status:</strong> Temporarily blocked for ${blockedMinutes} minutes
          </p>
        </div>
        
        <p class="greeting">
          This is a security measure to protect your account from unauthorized access. You will be able to log in again after ${blockedMinutes} minutes.
        </p>
        
        <div class="info">
          <span class="alert-icon">ℹ️</span>
          <p class="alert-text">
            <strong>What to do:</strong> If you forgot your password, use the "Forgot Password" option to reset it. If you believe this was an error or your account is compromised, please contact our support team immediately.
          </p>
        </div>
        
        <div class="divider"></div>
        
        <p class="greeting">
          Thank you for your understanding. We take account security seriously.
        </p>
      </div>
      
      <div class="footer">
        <p class="footer-text">This is an automated message, please do not reply to this email.</p>
        <p class="footer-text">© ${new Date().getFullYear()} SeatWaves. All rights reserved.</p>
      </div>
    </div>
  </body>
  </html>
    `.trim();
}
