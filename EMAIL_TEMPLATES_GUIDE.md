# Email Templates Guide

This guide explains all available email templates in `src/lib/email-template.ts` and how to use them in your application.

## Available Templates

### 1. **Email Verification OTP**
Used when users need to verify their email address.

**Functions:**
- `generateOTPEmailText({ otp, validityMinutes? })`
- `generateOTPEmailHTML({ otp, validityMinutes? })`

**Usage Example:**
```typescript
await this.emailService.sendOTPEmail({
  to: user.email,
  subject: 'Email Verification OTP',
  text: generateOTPEmailText({ otp: otpData.otp }),
  html: generateOTPEmailHTML({ otp: otpData.otp }),
});
```

**Used in:**
- User registration (`signUp`)
- Email verification during login (`signIn`, `signInWeb`)
- Resend OTP (`resendOtp`)

---

### 2. **Two-Factor Authentication (2FA)**
Used when users have 2FA enabled and need a verification code.

**Functions:**
- `generateTwoFactorEmailText({ otp, validityMinutes? })`
- `generateTwoFactorEmailHTML({ otp, validityMinutes? })`

**Usage Example:**
```typescript
await this.emailService.sendOTPEmail({
  to: user.email,
  subject: 'Two Factor Authentication',
  text: generateTwoFactorEmailText({ otp: otpData.otp }),
  html: generateTwoFactorEmailHTML({ otp: otpData.otp }),
});
```

**Used in:**
- Login with 2FA enabled (`signIn`, `signInWeb`)
- Resend 2FA code (`resend2fa`)

---

### 3. **Password Reset**
Used when users request a password reset.

**Functions:**
- `generatePasswordResetEmailText({ otp, validityMinutes? })`
- `generatePasswordResetEmailHTML({ otp, validityMinutes? })`

**Usage Example:**
```typescript
await this.emailService.sendEmailToUser(user.id, {
  subject: 'Password Reset Request',
  text: generatePasswordResetEmailText({ otp }),
  html: generatePasswordResetEmailHTML({ otp }),
});
```

**Used in:**
- Forgot password flow (`forgotPassword`)

---

### 4. **Welcome Email**
Send a welcome email after successful registration.

**Functions:**
- `generateWelcomeEmailText({ name, email })`
- `generateWelcomeEmailHTML({ name, email })`

**Usage Example:**
```typescript
await this.emailService.sendEmailToUser(user.id, {
  subject: 'Welcome to SeatWaves!',
  text: generateWelcomeEmailText({ name: user.name, email: user.email }),
  html: generateWelcomeEmailHTML({ name: user.name, email: user.email }),
});
```

**Suggested use:**
- After successful registration in `signUp` method
- After email verification is complete

---

### 5. **Password Changed Confirmation**
Notify users when their password has been changed.

**Functions:**
- `generatePasswordChangedEmailText({ name? })`
- `generatePasswordChangedEmailHTML({ name? })`

**Usage Example:**
```typescript
await this.emailService.sendEmailToUser(user.id, {
  subject: 'Password Changed Successfully',
  text: generatePasswordChangedEmailText({ name: user.name }),
  html: generatePasswordChangedEmailHTML({ name: user.name }),
});
```

**Suggested use:**
- After successful password change in `changePassword` method
- After successful password reset in `resetPassword` method

---

### 6. **Account Blocked Notification**
Notify users when their account is temporarily blocked.

**Functions:**
- `generateAccountBlockedEmailText({ blockedMinutes })`
- `generateAccountBlockedEmailHTML({ blockedMinutes })`

**Usage Example:**
```typescript
const blockedMinutes = 15;
await this.emailService.sendEmailToUser(user.id, {
  subject: 'Account Temporarily Blocked',
  text: generateAccountBlockedEmailText({ blockedMinutes }),
  html: generateAccountBlockedEmailHTML({ blockedMinutes }),
});
```

**Suggested use:**
- In `checkLoginAttempts` method when blocking a user
- When detecting suspicious activity

---

## Template Features

All templates include:
- **Responsive Design**: Mobile-friendly layouts
- **Modern Styling**: Gradient headers, clean typography
- **Security Warnings**: Appropriate security notices for each type
- **Consistent Branding**: SeatWaves branding throughout
- **Professional Footer**: Auto-updating copyright year

## Customization

### Changing the Company Name
Update `SeatWaves` to your company name in the footer sections of each template.

### Adjusting Colors
The templates use a purple gradient theme:
- Primary: `#667eea`
- Secondary: `#764ba2`

You can modify these in the `getBaseEmailStyles()` function.

### Default OTP Validity
Default validity is 10 minutes. You can override it:
```typescript
generateOTPEmailHTML({ otp: '123456', validityMinutes: 15 })
```

## Implementation Checklist

- [x] Email Verification OTP - Implemented in auth service
- [x] Two-Factor Authentication - Implemented in auth service
- [x] Password Reset - Implemented in auth service
- [ ] Welcome Email - Add to signUp after email verification
- [ ] Password Changed - Add to changePassword and resetPassword
- [ ] Account Blocked - Add to checkLoginAttempts

## Best Practices

1. **Always send both text and HTML versions** for better email client compatibility
2. **Use descriptive subjects** that clearly indicate the email purpose
3. **Include security warnings** for sensitive operations
4. **Test emails** in multiple email clients (Gmail, Outlook, etc.)
5. **Keep OTP validity short** (10-15 minutes) for security
6. **Log email sending** for audit trails
7. **Handle email failures gracefully** with proper error handling

## Example: Adding Welcome Email to Registration

```typescript
// In signUp method, after email verification
async signUp(dto: CreateUserDto) {
  // ... existing code ...
  
  // After OTP email is sent
  await this.emailService.sendOTPEmail({
    to: result.createUser.email,
    subject: 'Email Verification OTP',
    text: generateOTPEmailText({ otp: result.otp }),
    html: generateOTPEmailHTML({ otp: result.otp }),
  });

  return {
    status: true,
    redirect: '/auth/verify-email',
    message: 'User Registered Successfully. Please verify your email with the OTP sent.',
  };
}

// In verifyEmail method, after successful verification
async verifyEmail(otp: string, res: Response) {
  return await this.prisma.$transaction(async (tx) => {
    // ... existing verification code ...
    
    // Send welcome email after successful verification
    await this.emailService.sendEmailToUser(user.id, {
      subject: 'Welcome to SeatWaves!',
      text: generateWelcomeEmailText({ name: user.name, email: user.email }),
      html: generateWelcomeEmailHTML({ name: user.name, email: user.email }),
    });

    return {
      status: true,
      accessToken,
      message: 'Email verified successfully',
    };
  });
}
```

## Example: Adding Password Changed Notification

```typescript
// In changePassword method
async changePassword(data: ChangePasswordDto, userId: string, req: Request) {
  // ... existing password change code ...
  
  await this.prisma.user.update({
    where: { id: userId },
    data: {
      password: hashed,
      loginHistory: {
        create: {
          attempt: 'RESET_PASSWORD',
          ip: req.ip || '0.0.0.0',
          userAgent: req.headers['user-agent'] || '',
          country: (req.headers['cf-ipcountry'] as string) || '',
        },
      },
    },
  });

  // Send password changed notification
  await this.emailService.sendEmailToUser(userId, {
    subject: 'Password Changed Successfully',
    text: generatePasswordChangedEmailText({ name: found.name }),
    html: generatePasswordChangedEmailHTML({ name: found.name }),
  });

  const token = await this.jwtService.sign({ userId: found.id });
  return { status: true, token, message: 'Password changed successfully' };
}
```

## Support

For issues or questions about email templates, contact the development team.
