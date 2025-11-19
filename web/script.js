document.addEventListener('DOMContentLoaded', function() {
    console.log("Main script loaded. Setting up event listeners.");

    // Get all necessary elements from the DOM
    const addFileCard = document.getElementById('add-file-card');
    const uploadModal = document.getElementById('upload-modal');
    const closeModal = document.getElementById('close-modal');
    const uploadForm = document.getElementById('upload-form');
    const analyzeButton = document.getElementById('analyze-button'); 

    // --- Modal Logic ---
    addFileCard.addEventListener('click', () => {
        uploadModal.classList.remove('hidden');
    });

    const closeTheModal = () => {
        uploadModal.classList.add('hidden');
        uploadForm.reset();
    };

    closeModal.addEventListener('click', closeTheModal);

    // --- The Core Logic: Button Click Handler ---
    analyzeButton.addEventListener('click', () => {
        const projectNameInput = document.getElementById('file-name');
        const fileInput = document.getElementById('file-upload');
        
        const projectName = projectNameInput.value;
        const file = fileInput.files[0];

        // 1. Validate inputs
        if (!file || !projectName.trim()) {
            alert('Please provide both a project name and a file.');
            return;
        }
        
        if (!file.name.toLowerCase().endsWith('.sol')) {
            alert('Invalid file type. Please upload a .sol file.');
            return;
        }
        
        console.log(`[index] Button clicked. Project Name: "${projectName}", Original Filename: "${file.name}"`);

        // 2. Read the file content
        const reader = new FileReader();

        // 3. Define what happens when the file is successfully read
        reader.onload = function(event) {
            const fileContent = event.target.result;
            
            // *** CRITICAL LOGGING PART 1 ***
            console.log(`[index] FileReader finished. Content length: ${fileContent ? fileContent.length : 'NULL or EMPTY'}.`);
            console.log(`[index] Content preview: "${fileContent ? fileContent.substring(0, 100) + '...' : 'NO CONTENT'}"`);

            try {
                // 4. Store ALL necessary data
                console.log("[index] Storing data into sessionStorage...");
                sessionStorage.setItem('analysisProjectName', projectName);
                sessionStorage.setItem('analysisOriginalFileName', file.name);
                sessionStorage.setItem('analysisFileContent', fileContent);
                console.log("[index] Data stored.");

                // 5. Redirect
                console.log("[index] Redirecting NOW to analysis.html...");
                window.location.href = `analysis.html?name=${encodeURIComponent(projectName)}`;

            } catch (error) {
                console.error("[index] FATAL: Error saving to sessionStorage. This is often due to browser settings (private mode) or the file being too large.", error);
                alert("Could not start analysis. Browser storage might be full, disabled, or in private mode.");
            }
        };

        reader.onerror = function() {
            console.error("[index] FileReader error:", reader.error);
            alert('Failed to read the selected file.');
        };
        
        reader.readAsText(file); 
        
        closeTheModal();
    });
});