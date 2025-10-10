interface OTPEmailOptions {
  otp: string;
  validityMinutes?: number;
}

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
    <style>
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
      .warning-icon {
        display: inline-block;
        font-size: 20px;
        margin-right: 8px;
        vertical-align: middle;
      }
      .warning-text {
        display: inline-block;
        font-size: 14px;
        color: #856404;
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
      @media only screen and (max-width: 600px) {
        .content {
          padding: 30px 20px;
        }
        .otp-code {
          font-size: 36px;
          letter-spacing: 6px;
        }
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="header">
        <h1>🔐 Verification Code</h1>
      </div>
      
      <div class="content">
        <p class="greeting">
          Hello,
        </p>
        
        <p class="greeting">
          We received a request to verify your account. Please use the One-Time Password (OTP) below to complete your verification:
        </p>
        
        <div class="otp-container">
          <div class="otp-label">Your OTP Code</div>
          <div class="otp-code">${otp}</div>
          <div class="validity">⏱️ Valid for ${validityMinutes} minutes</div>
        </div>
        
        <div class="warning">
          <span class="warning-icon">⚠️</span>
          <p class="warning-text">
            <strong>Security Notice:</strong> Never share this OTP with anyone. Our team will never ask for your OTP via email, phone, or any other means.
          </p>
        </div>
        
        <div class="divider"></div>
        
        <p class="greeting">
          If you didn't request this verification code, please ignore this email or contact our support team if you have concerns about your account security.
        </p>
      </div>
      
      <div class="footer">
        <p class="footer-text">
          This is an automated message, please do not reply to this email.
        </p>
        <p class="footer-text">
          © ${new Date().getFullYear()} Your Company. All rights reserved.
        </p>
      </div>
    </div>
  </body>
  </html>
    `.trim();
}
