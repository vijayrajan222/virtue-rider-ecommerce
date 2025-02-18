document.addEventListener('DOMContentLoaded', function() {
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const otpForm = document.getElementById('otp-form');
    const resetPasswordForm = document.getElementById('reset-password-form');
    const loadingSpinner = document.getElementById('loading-spinner');
    let userEmail = '';
    let verifiedOTP = '';

    // Send OTP
    forgotPasswordForm?.addEventListener('submit', async function(e) {
        e.preventDefault();
        clearErrors();

        const email = document.getElementById('email')?.value.trim();
        if (!email) {
            showError('emailError', 'Email is required');
            return;
        }

        try {
            if (loadingSpinner) loadingSpinner.classList.remove('hidden');

            const response = await fetch('/forgot-password/send-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();
            
            if (loadingSpinner) loadingSpinner.classList.add('hidden');

            if (data.success) {
                userEmail = email;
                forgotPasswordForm.classList.add('hidden');
                otpForm?.classList.remove('hidden');
                setupOTPInputs();
            } else {
                showError('emailError', data.message || 'Failed to send OTP');
            }
        } catch (error) {
            console.error('Forgot password error:', error);
            if (loadingSpinner) loadingSpinner.classList.add('hidden');
            showError('emailError', 'Something went wrong! Please try again later.');
        }
    });

    // Verify OTP
    otpForm?.addEventListener('submit', async function(e) {
        e.preventDefault();
        clearErrors();

        const otpInputs = document.querySelectorAll('.otp-input');
        const otp = Array.from(otpInputs).map(input => input.value).join('');

        if (otp.length !== 6) {
            showError('otpError', 'Please enter a valid 6-digit OTP');
            return;
        }

        try {
            if (loadingSpinner) loadingSpinner.classList.remove('hidden');

            const response = await fetch('/forgot-password/verify-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: userEmail,
                    otp
                })
            });

            const data = await response.json();
            
            if (loadingSpinner) loadingSpinner.classList.add('hidden');

            if (data.success) {
                verifiedOTP = otp;
                otpForm.classList.add('hidden');
                resetPasswordForm?.classList.remove('hidden');
            } else {
                showError('otpError', data.message || 'Invalid OTP');
            }
        } catch (error) {
            console.error('OTP verification error:', error);
            if (loadingSpinner) loadingSpinner.classList.add('hidden');
            showError('otpError', 'Failed to verify OTP');
        }
    });

    // Reset Password
    resetPasswordForm?.addEventListener('submit', async function(e) {
        e.preventDefault();
        clearErrors();

        const newPassword = document.getElementById('newPassword')?.value;
        const confirmPassword = document.getElementById('confirmPassword')?.value;

        if (!newPassword || !confirmPassword) {
            showError('passwordError', 'Both passwords are required');
            return;
        }

        if (newPassword !== confirmPassword) {
            showError('passwordError', 'Passwords do not match');
            return;
        }

        try {
            if (loadingSpinner) loadingSpinner.classList.remove('hidden');

            const response = await fetch('/forgot-password/reset', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: userEmail,
                    otp: verifiedOTP,
                    newPassword
                })
            });

            const data = await response.json();
            
            if (loadingSpinner) loadingSpinner.classList.add('hidden');

            if (data.success) {
                window.location.href = data.redirectUrl;
            } else {
                showError('passwordError', data.message || 'Failed to reset password');
            }
        } catch (error) {
            console.error('Password reset error:', error);
            if (loadingSpinner) loadingSpinner.classList.add('hidden');
            showError('passwordError', 'Failed to reset password');
        }
    });

    // Helper functions
    function showError(elementId, message) {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.remove('hidden');
        }
    }

    function clearErrors() {
        const errorElements = document.querySelectorAll('[id$="Error"]');
        errorElements.forEach(element => {
            if (element) {
                element.textContent = '';
                element.classList.add('hidden');
            }
        });
    }

    function setupOTPInputs() {
        const otpInputs = document.querySelectorAll('.otp-input');
        
        otpInputs.forEach((input, index) => {
            input.value = '';
            
            input.addEventListener('input', function(e) {
                if (this.value.length === 1 && index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                }
            });

            input.addEventListener('keydown', function(e) {
                if (e.key === 'Backspace' && !this.value && index > 0) {
                    otpInputs[index - 1].focus();
                }
            });
        });
    }
}); 