document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const loadingSpinner = document.getElementById('loading-spinner');

    if (!loginForm) {
        console.error('Login form not found');
        return;
    }

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        clearErrors();

        const email = document.getElementById('email')?.value.trim();
        const password = document.getElementById('password')?.value;

        if (!email || !password) {
            showError('generalError', 'All fields are required');
            return;
        }

        try {
            if (loadingSpinner) loadingSpinner.classList.remove('hidden');

            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    password
                })
            });

            const data = await response.json();
            
            if (loadingSpinner) loadingSpinner.classList.add('hidden');

            if (data.success) {
                window.location.href = data.redirectUrl;
            } else {
                showError('generalError', data.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            if (loadingSpinner) loadingSpinner.classList.add('hidden');
            showError('generalError', 'Something went wrong! Please try again.');
        }
    });

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
}); 