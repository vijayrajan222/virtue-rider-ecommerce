let cropper = null;
let currentFileInput = null;

// Initialize cropper when an image is selected
function initCropper(input) {
    if (input.files && input.files[0]) {
        currentFileInput = input;
        const reader = new FileReader();
        
        reader.onload = function(e) {
            // Show the cropper modal
            const cropperModal = document.getElementById('cropperModal');
            const cropperImage = document.getElementById('cropperImage');
            
            cropperImage.src = e.target.result;
            cropperModal.classList.remove('hidden');
            cropperModal.classList.add('flex');
            
            // Initialize Cropper.js
            if (cropper) {
                cropper.destroy();
            }
            
            cropper = new Cropper(cropperImage, {
                aspectRatio: 1, // Square aspect ratio
                viewMode: 2,    // Restrict the crop box to not exceed the size of the canvas
                responsive: true,
                restore: false,
                autoCropArea: 1,
                background: false,
                modal: true,
                guides: true,
                highlight: true,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: false,
            });
        };
        
        reader.readAsDataURL(input.files[0]);
    }
}

// Handle crop button click
function handleCrop() {
    if (cropper) {
        const croppedCanvas = cropper.getCroppedCanvas({
            width: 800,    // Maximum width
            height: 800,   // Maximum height
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high',
        });

        // Convert canvas to blob
        croppedCanvas.toBlob((blob) => {
            // Create a new file from the blob
            const croppedFile = new File([blob], 
                'cropped_' + currentFileInput.files[0].name, 
                { type: 'image/jpeg', lastModified: new Date().getTime() }
            );

            // Create a new FileList-like object
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(croppedFile);
            currentFileInput.files = dataTransfer.files;

            // Update preview if needed
            const previewContainer = currentFileInput.parentElement.querySelector('.image-preview');
            if (previewContainer) {
                previewContainer.src = croppedCanvas.toDataURL();
            }

            // Close the modal
            closeCropperModal();
        }, 'image/jpeg', 0.9);
    }
}

// Close cropper modal
function closeCropperModal() {
    const cropperModal = document.getElementById('cropperModal');
    cropperModal.classList.add('hidden');
    cropperModal.classList.remove('flex');
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
}

// Initialize all file inputs with cropper
function initializeImageUploads() {
    document.querySelectorAll('input[type="file"]').forEach(input => {
        input.addEventListener('change', function() {
            initCropper(this);
        });
    });
} 