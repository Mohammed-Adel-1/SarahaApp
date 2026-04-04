
export const emailTemplate = ({otp}={})=> {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>OTP Verification</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f4f4; font-family: Arial, sans-serif;">

  <table align="center" width="100%" cellpadding="0" cellspacing="0" style="padding:20px 0;">
    <tr>
      <td>
        <table align="center" width="400" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 5px 15px rgba(0,0,0,0.05);">

          <!-- Header -->
          <tr>
            <td style="background:#4A90E2; padding:20px; text-align:center; color:#ffffff;">
              <h2 style="margin:0;">Saraha App</h2>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:30px; text-align:center;">
              <h3 style="margin-top:0; color:#333;">Verify Your Account</h3>
              <p style="color:#777; font-size:14px;">
                Use the following OTP code to complete your verification process:
              </p>

              <!-- OTP Box -->
              <div style="margin:25px 0; font-size:28px; letter-spacing:6px; font-weight:bold; color:#4A90E2;">
               code: ${otp}
              </div>

              <p style="color:#999; font-size:13px;">
                This code will expire in 2 minutes.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9f9f9; padding:15px; text-align:center; font-size:12px; color:#aaa;">
              If you didn’t request this, you can safely ignore this email.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`
}