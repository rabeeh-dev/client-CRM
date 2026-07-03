document.addEventListener('DOMContentLoaded', () => {
    const passwordInput = document.getElementById('password');
    const passwordToggle = document.getElementById('passwordToggle');
    const toggleIcon = document.getElementById('toggleIcon');
    const loginForm = document.getElementById('loginForm');
    const btnSubmit = document.getElementById('btnSubmit');

    // Toggle password visibility
    if (passwordToggle && passwordInput && toggleIcon) {
        passwordToggle.addEventListener('click', () => {
            const isPassword = passwordInput.getAttribute('type') === 'password';
            
            // Toggle type
            passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
            
            // Toggle icon
            toggleIcon.setAttribute('data-lucide', isPassword ? 'eye-off' : 'eye');
            
            // Re-create icons to apply change
            if (window.lucide) {
                window.lucide.createIcons();
            }
        });
    }

    // Input interactivity - focus enhancements
    const inputs = document.querySelectorAll('.input-wrapper input');
    inputs.forEach(input => {
        // Clear errors inline when user starts typing
        input.addEventListener('input', () => {
            const group = input.closest('.input-group');
            if (group && group.classList.contains('has-error')) {
                group.classList.remove('has-error');
                const errorSpan = group.querySelector('.error-text');
                if (errorSpan) {
                    errorSpan.remove();
                }
            }
        });
    });

    // Form submit validation & loading state
    if (loginForm && btnSubmit) {
        loginForm.addEventListener('submit', (e) => {
            let hasError = false;
            
            // Clean inputs client-side
            inputs.forEach(input => {
                if (!input.value.trim()) {
                    hasError = true;
                    // Add validation styling if not already styled by server
                    const group = input.closest('.input-group');
                    if (group && !group.classList.contains('has-error')) {
                        group.classList.add('has-error');
                    }
                }
            });

            if (hasError) {
                e.preventDefault();
                return;
            }

            // Visual feedback on submit button
            const submitText = btnSubmit.querySelector('span');
            const submitIcon = btnSubmit.querySelector('.btn-icon');
            if (submitText && submitIcon) {
                btnSubmit.style.pointerEvents = 'none';
                btnSubmit.style.opacity = '0.8';
                submitText.textContent = 'Signing In...';
                submitIcon.setAttribute('data-lucide', 'loader-2');
                submitIcon.classList.add('spin-icon');
                if (window.lucide) {
                    window.lucide.createIcons();
                }
            }
        });
    }
});

// CSS Injection for loading loader spin utility
const style = document.createElement('style');
style.textContent = `
    .spin-icon {
        animation: spin 1s linear infinite;
    }
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);
