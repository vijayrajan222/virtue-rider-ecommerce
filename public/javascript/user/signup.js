document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('signup-form');
    const passwordToggles = document.querySelectorAll('.fa-eye');
    const loadingSpinner = document.getElementById('loading-spinner');
    const otpModal = document.getElementById('otpModal');
    const referralModal = document.getElementById('referralModal');
    const generalError = document.getElementById('generalError');
    const resendOtpButton = document.getElementById('resendOtp');
    const resendTimer = document.getElementById('resendTimer');
    let userEmail = ''; // Store email for OTP verification
    let timerInterval = null;
    let timeLeft = 30; // 30 seconds timer

    if (!form) {
        console.error('Signup form not found');
        return;
    }

    // Password validation function
    const validatePassword = (password) => {
        const minLength = 8;
        const maxLength = 12;

        // Check length
        if (password.length < minLength || password.length > maxLength) {
            return {
                isValid: false,
                message: `Password must be between ${minLength} and ${maxLength} characters long`
            };
        }

        // Check for uppercase letter
        if (!/[A-Z]/.test(password)) {
            return {
                isValid: false,
                message: 'Password must contain at least one uppercase letter'
            };
        }

        // Check for lowercase letter
        if (!/[a-z]/.test(password)) {
            return {
                isValid: false,
                message: 'Password must contain at least one lowercase letter'
            };
        }

        // Check for number
        if (!/[0-9]/.test(password)) {
            return {
                isValid: false,
                message: 'Password must contain at least one number'
            };
        }

        return { isValid: true };
    };

    // Helper function to show error
    const showError = (elementId, message) => {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.remove('hidden');
            // Add red border to input
            document.getElementById(elementId.replace('Error', '')).classList.add('border-red-500');
        } else {
            console.error(`Error element with id '${elementId}' not found`);
        }
    };

    // Helper function to hide error
    const hideError = (elementId) => {
        const errorElement = document.getElementById(elementId);
        errorElement.classList.add('hidden');
        // Remove red border from input
        document.getElementById(elementId.replace('Error', '')).classList.remove('border-red-500');
    };

    // Real-time validation for First Name
    document.getElementById('firstName').addEventListener('input', function() {
        const value = this.value.trim();
        if (!/^[a-zA-Z]{3,10}$/.test(value)) {
            showError('firstNameError', 'First name should contain only letters (3-10 characters)');
        } else {
            hideError('firstNameError');
        }
    });

    // Real-time validation for Last Name
    document.getElementById('lastName').addEventListener('input', function() {
        const value = this.value.trim();
        if (!/^[a-zA-Z]{1,10}$/.test(value)) {
            showError('lastNameError', 'Last name should contain only letters (1-10 characters)');
        } else {
            hideError('lastNameError');
        }
    });

    // Real-time validation for Email
    document.getElementById('email').addEventListener('input', function() {
        const value = this.value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            showError('emailError', 'Please enter a valid email address');
        } else {
            hideError('emailError');
        }
    });

    // Real-time validation for Password
    document.getElementById('password').addEventListener('input', function() {
        const value = this.value;
        const validation = validatePassword(value);
        if (!validation.isValid) {
            showError('passwordError', validation.message);
        } else {
            hideError('passwordError');
        }
    });

    // Real-time validation for Confirm Password
    document.getElementById('confirmPassword').addEventListener('input', function() {
        const password = document.getElementById('password').value;
        if (this.value !== password) {
            showError('confirmPasswordError', 'Passwords do not match');
        } else {
            hideError('confirmPasswordError');
        }
    });

    // Form submission
    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        
        // Clear previous errors
        const generalError = document.getElementById('generalError');
        generalError.classList.add('hidden');
        generalError.textContent = '';

        const firstName = document.getElementById('firstName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Basic validation
        if (!firstName || !lastName || !email || !password || !confirmPassword) {
            generalError.textContent = 'All fields are required';
            generalError.classList.remove('hidden');
            return;
        }

        // Password match validation
        if (password !== confirmPassword) {
            generalError.textContent = 'Passwords do not match';
            generalError.classList.remove('hidden');
            return;
        }

        try {
            // Show loading spinner
            const loadingSpinner = document.getElementById('loading-spinner');
            if (loadingSpinner) loadingSpinner.classList.remove('hidden');

            const response = await fetch('/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    firstName,
                    lastName,
                    email,
                    password
                })
            });

            const data = await response.json();
            
            // Hide loading spinner
            if (loadingSpinner) loadingSpinner.classList.add('hidden');

            if (data.success) {
                // Store email for OTP verification
                userEmail = email;
                localStorage.setItem('userEmail', userEmail);
                
                // Hide form and show OTP modal
                form.classList.add('hidden');
                const otpModal = document.getElementById('otpModal');
                if (otpModal) {
                    otpModal.classList.remove('hidden');
                    setupOTPInputs();
                    startOTPTimer();
                }
            } else {
                // Show error message
                generalError.textContent = data.message || 'Something went wrong!';
                generalError.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Signup error:', error);
            if (loadingSpinner) loadingSpinner.classList.add('hidden');
            generalError.textContent = 'Something went wrong! Please try again.';
            generalError.classList.remove('hidden');
        }
    });

    // Password toggle functionality
    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', function () {
            const input = this.closest('.relative').querySelector('input');
            if (input.type === 'password') {
                input.type = 'text';
                this.classList.remove('fa-eye');
                this.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                this.classList.remove('fa-eye-slash');
                this.classList.add('fa-eye');
            }
        });
    });

    // OTP input setup
    function setupOTPInputs() {
        const otpInputs = document.querySelectorAll('.otp-input');
        
        otpInputs.forEach((input, index) => {
            input.value = ''; // Clear existing values
            
            input.addEventListener('input', function(e) {
                if (this.value.length === 1) {
                    if (index < otpInputs.length - 1) {
                        otpInputs[index + 1].focus();
                    }
                }
            });

            input.addEventListener('keydown', function(e) {
                if (e.key === 'Backspace' && !this.value && index > 0) {
                    otpInputs[index - 1].focus();
                }
            });
        });
    }

    function startOTPTimer() {
        // Clear any existing timer
        if (timerInterval) {
            clearInterval(timerInterval);
        }

        // Reset time
        timeLeft = 30;
        updateTimerDisplay();

        // Start new timer
        timerInterval = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();

            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                timerInterval = null;
                enableResendButton();
            }
        }, 1000); // Run every 1000ms (1 second)
    }

    function updateTimerDisplay() {
        const resendTimer = document.getElementById('resendTimer');
        const resendOtpButton = document.getElementById('resendOtp');
        
        if (resendTimer && resendOtpButton) {
            if (timeLeft > 0) {
                resendTimer.textContent = `Resend OTP in ${timeLeft} seconds`;
                resendTimer.classList.remove('hidden');
                resendOtpButton.disabled = true;
                resendOtpButton.classList.add('opacity-50');
            } else {
                resendTimer.classList.add('hidden');
                enableResendButton();
            }
        }
    }

    function enableResendButton() {
        const resendOtpButton = document.getElementById('resendOtp');
        if (resendOtpButton) {
            resendOtpButton.disabled = false;
            resendOtpButton.classList.remove('opacity-50');
        }
    }

    // Start timer when OTP modal is shown
    if (otpModal) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    if (!otpModal.classList.contains('hidden')) {
                        startOTPTimer();
                    } else {
                        // Clear timer when modal is hidden
                        if (timerInterval) {
                            clearInterval(timerInterval);
                            timerInterval = null;
                        }
                    }
                }
            });
        });

        observer.observe(otpModal, { attributes: true });
    }

    // Resend OTP handler
    if (resendOtpButton) {
        resendOtpButton.addEventListener('click', async function(e) {
            e.preventDefault();
            if (this.disabled) return;

            try {
                const response = await fetch('/resend-otp', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email: userEmail })
                });

                const data = await response.json();
                
                if (data.success) {
                    showMessage('otpError', 'OTP resent successfully', 'text-green-600');
                    startOTPTimer(); // Restart timer after successful resend
                } else {
                    showMessage('otpError', data.message || 'Failed to resend OTP');
                }
            } catch (error) {
                console.error('Resend OTP error:', error);
                showMessage('otpError', 'Failed to resend OTP');
            }
        });
    }

    // OTP Verification Handler
    const verifyOtpButton = document.getElementById('verifyOtp');
    if (verifyOtpButton) {
        verifyOtpButton.addEventListener('click', async function(e) {
            e.preventDefault();
            console.log('Verifying OTP...'); // Debug log

            const otpInputs = document.querySelectorAll('.otp-input');
            const otp = Array.from(otpInputs).map(input => input.value).join('');
            
            if (otp.length !== 6) {
                const otpError = document.getElementById('otpError');
                if (otpError) {
                    otpError.textContent = 'Please enter a valid 6-digit OTP';
                    otpError.classList.remove('hidden');
                }
                return;
            }

            try {
                const response = await fetch('/verify-otp', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: userEmail,
                        otp: otp
                    })
                });

                const data = await response.json();
                console.log('OTP verification response:', data); // Debug log

                if (data.success) {
                    // Store email for referral process
                    localStorage.setItem('userEmail', userEmail);
                    
                    // Hide OTP modal
                    if (otpModal) {
                        otpModal.classList.add('hidden');
                    }

                    // Show referral modal
                    if (referralModal) {
                        console.log('Showing referral modal'); // Debug log
                        referralModal.classList.remove('hidden');
                    } else {
                        console.error('Referral modal not found'); // Debug log
                    }
                } else {
                    const otpError = document.getElementById('otpError');
                    if (otpError) {
                        otpError.textContent = data.message || 'Invalid OTP';
                        otpError.classList.remove('hidden');
                    }
                }
            } catch (error) {
                console.error('OTP verification error:', error);
                const otpError = document.getElementById('otpError');
                if (otpError) {
                    otpError.textContent = 'Something went wrong! Please try again.';
                    otpError.classList.remove('hidden');
                }
            }
        });
    }

    // Referral Code Handlers
    const applyReferralButton = document.getElementById('applyReferral');
    const skipReferralButton = document.getElementById('skipReferral');

    if (applyReferralButton) {
        applyReferralButton.addEventListener('click', async function(e) {
            e.preventDefault();
            console.log('Apply referral clicked'); // Debug log

            const referralCode = document.getElementById('referralCodeInput')?.value.trim().toUpperCase();
            const referralError = document.getElementById('referralError');
            const email = localStorage.getItem('userEmail');

            if (!email) {
                if (referralError) {
                    referralError.textContent = 'Session expired. Please sign up again.';
                    referralError.classList.remove('hidden');
                }
                return;
            }

            if (!referralCode) {
                if (referralError) {
                    referralError.textContent = 'Please enter a referral code';
                    referralError.classList.remove('hidden');
                }
                return;
            }

            try {
                const response = await fetch('/verify-referral', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        referralCode,
                        email 
                    })
                });

                const data = await response.json();

                if (data.success) {
                    alert(data.message);
                    window.location.href = '/login';
                } else {
                    if (referralError) {
                        referralError.textContent = data.message || 'Invalid referral code';
                        referralError.classList.remove('hidden');
                    }
                }
            } catch (error) {
                console.error('Referral error:', error);
                if (referralError) {
                    referralError.textContent = 'Something went wrong! Please try again.';
                    referralError.classList.remove('hidden');
                }
            }
        });
    }

    if (skipReferralButton) {
        skipReferralButton.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Skip referral clicked'); // Debug log
            window.location.href = '/login';
        });
    }

    // Helper functions
    function showMessage(elementId, message, className = 'text-red-600') {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
            element.className = `${className} text-sm text-center mb-4`;
            element.classList.remove('hidden');
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
});