     document.addEventListener('DOMContentLoaded', function() {
    // --- DOM Elements ---
    const themeToggle = document.getElementById('themeToggle');
    const languageToggle = document.getElementById('languageToggle');
    const fileInput = document.getElementById('fileInput');
    const dropzone = document.getElementById('dropzone');
    const uploadStatus = document.getElementById('uploadStatus');
    const editorSection = document.getElementById('editorSection');
    const imageGrid = document.getElementById('imageGrid');
    const applyToAllBtn = document.getElementById('applyToAllBtn');
    const downloadAllBtn = document.getElementById('downloadAllBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');

    // Shared Controls
    const widthInput = document.getElementById('width');
    const heightInput = document.getElementById('height');
    const maintainRatioCheckbox = document.getElementById('maintainRatio');
    const qualityInput = document.getElementById('quality');
    const qualityValue = document.getElementById('qualityValue');
    const formatButtonsContainer = document.getElementById('formatButtonsContainer'); // Container for format buttons
    const enhanceCheckbox = document.getElementById('enhanceCheckbox');
    const selectedImageInfo = document.getElementById('selectedImageInfo');

    // --- State Variables ---
    let uploadedImagesData = []; // Holds state for each image
    let selectedImageId = null;
    let uniqueIdCounter = 0;
    let isProcessingBatch = false; // Flag for ongoing batch operations

    // --- Initialization ---
    initializeTheme();
    initializeLanguage();
    updateFooterYear();
    setupEventListeners();
    updateSharedControlsUI(null); // Set initial disabled state for controls

    // --- Functions ---

    function initializeTheme() {
        const isDarkMode = document.documentElement.classList.contains('dark');
        themeToggle.innerHTML = isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    }

    function initializeLanguage() {
        const lang = document.documentElement.lang;
        languageToggle.textContent = lang === 'ar' ? 'ع' : 'EN';
        if (lang === 'ar') updateTextsToArabic(); else updateTextsToEnglish();
    }

    function updateFooterYear() {
        const yearSpan = document.getElementById('footerYear');
        if (yearSpan) yearSpan.textContent = new Date().getFullYear();
    }

    function setupEventListeners() {
        themeToggle.addEventListener('click', toggleTheme);
        languageToggle.addEventListener('click', toggleLanguage);

        // Drag and Drop & File Input
        dropzone.addEventListener('dragover', handleDragOver, false);
        dropzone.addEventListener('dragleave', handleDragLeave, false);
        dropzone.addEventListener('drop', handleDrop, false);
        dropzone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleFileSelect);

        // Shared Controls Listeners (only if an image is selected)
        widthInput.addEventListener('input', handleDimensionChange);
        heightInput.addEventListener('input', handleDimensionChange);
        maintainRatioCheckbox.addEventListener('change', handleDimensionChange);
        qualityInput.addEventListener('input', handleQualityChange);
        formatButtonsContainer.addEventListener('click', handleFormatChange); // Event delegation
        enhanceCheckbox.addEventListener('change', handleEnhanceChange);

        // Bulk Action Buttons
        applyToAllBtn.addEventListener('click', applySettingsToAllImages);
        downloadAllBtn.addEventListener('click', downloadAllProcessedImages);
        clearAllBtn.addEventListener('click', clearAllImages);

        // Listener for clicks within the image grid (for selection and individual download)
        imageGrid.addEventListener('click', handleGridClick);
    }

    // --- Theme and Language (Keep existing functions: toggleTheme, toggleLanguage, updateTexts, etc.) ---
    // [Include the toggleTheme, toggleLanguage, updateTexts, updateTextsToArabic, updateTextsToEnglish functions from the previous correct answer here]
    function toggleTheme() {
        document.documentElement.classList.toggle('dark');
        const isDarkMode = document.documentElement.classList.contains('dark');
        localStorage.setItem('color-theme', isDarkMode ? 'dark' : 'light');
        initializeTheme(); // Update icon
    }

    function toggleLanguage() {
        const currentLang = document.documentElement.lang;
        const newLang = currentLang === 'en' ? 'ar' : 'en';
        document.documentElement.lang = newLang;
        document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
        localStorage.setItem('language', newLang);
        initializeLanguage(); // Update toggle text and all UI text
    }

    function updateTexts(langData) {
         Object.keys(langData).forEach(id => {
             const element = document.getElementById(id);
             if (element) {
                 if (element.tagName === 'BUTTON' && element.querySelector('.button-text')) {
                     element.querySelector('.button-text').textContent = langData[id];
                 } else if (element.tagName === 'LABEL' && element.htmlFor) {
                     // Update label text, common pattern
                     element.textContent = langData[id];
                 }
                 else if (element.id === 'footerText' && element.querySelector('#footerYear')) {
                      // Special case for footer with dynamic year
                      const year = element.querySelector('#footerYear').textContent;
                      element.innerHTML = langData[id].replace('<span id="footerYear"></span>', `<span id="footerYear">${year}</span>`);
                 } else {
                     // Default: Set textContent for most elements like p, h3, span
                      if (element.id !== 'qualityValue' && element.id !== 'selectedImageInfo' ) { // Avoid overwriting dynamic values
                            element.textContent = langData[id];
                      }
                 }
             }
         });
         // Update quality slider labels specifically
         const qualityLabels = document.querySelectorAll('#quality ~ div span');
         if (qualityLabels.length === 2) {
             qualityLabels[0].textContent = langData['smallerFileText'] || 'Low';
             qualityLabels[1].textContent = langData['betterQualityText'] || 'High';
         }
         // Ensure format button text updates if not covered by ID matching
         const formatBtns = formatButtonsContainer.querySelectorAll('.format-btn span');
         formatBtns.forEach(span => {
             const key = span.id;
             if (key && langData[key]) {
                 span.textContent = langData[key];
             }
         });
    }

    function updateTextsToArabic() { /* Add Arabic translations here */
         const translations = {
             appTitle: 'أداة مؤيد لتغيير حجم الصور الإحترافية',
             appDescription: 'غيّر حجم صور متعددة وضغطها وحولها بسهولة. اسحب وأفلت، اضبط، وحمّل!',
             dropzoneText: 'اسحب وأفلت الصور هنا',
             browseFilesText: 'تصفح الملفات',
             uploadedImagesTitle: 'الصور المرفوعة',
             applyToAllBtnText: 'تطبيق الإعدادات على الكل',
             downloadAllBtnText: 'تحميل الكل (.zip)',
             clearAllBtnText: 'مسح الكل',
             optimizationSettingsTitle: "إعدادات التعديل (للصورة المحددة أو 'تطبيق على الكل')",
             dimensionsLabel: 'الأبعاد',
             widthLabel: 'العرض (بكسل)',
             heightLabel: 'الارتفاع (بكسل)',
             maintainRatioLabel: 'الحفاظ على نسبة العرض إلى الارتفاع',
             qualityLabel: 'الجودة',
             smallerFileText: 'منخفضة',
             betterQualityText: 'عالية',
             outputFormatLabel: 'صيغة الإخراج',
             jpgFormatText: 'JPG',
             pngFormatText: 'PNG',
             webpFormatText: 'WEBP',
             originalFormatText: 'الأصلي',
             enhanceLabel: 'تحسين الصورة (تباين)',
             featuresTitle: 'لماذا تستخدم أداة تغيير حجم الصور الإحترافية؟',
             lightningFastTitle: 'سريع وفعال',
             lightningFastDescription: 'عالج صورًا متعددة بسرعة من خلال عمليات خلفية محسّنة.',
             securePrivateTitle: 'عناصر تحكم مرنة',
             securePrivateDescription: 'اضبط الأبعاد والجودة والتنسيق وحسّن الصور بشكل فردي أو جماعي.',
             mobileFriendlyTitle: 'تنزيلات مجمعة',
             mobileFriendlyDescription: 'قم بتنزيل جميع صورك المعالجة بسهولة في ملف مضغوط واحد.',
             footerText: `© <span id="footerYear"></span> أداة تغيير حجم الصور الإحترافية. جميع الحقوق محفوظة.`,
             footerMadeWithLove: 'صنع بواسطة مؤيد دغمش'
         };
         updateTexts(translations);
         document.documentElement.dir = 'rtl';
    }

   function updateTextsToEnglish() { /* Add English translations here */
        const translations = {
             appTitle: 'Moayad AI Image Resizer Pro',
             appDescription: 'Resize, compress, and convert multiple images easily. Drag, drop, adjust, and download!',
             dropzoneText: 'Drag & Drop images here',
             browseFilesText: 'Browse Files',
             uploadedImagesTitle: 'Uploaded Images',
             applyToAllBtnText: 'Apply Settings to All',
             downloadAllBtnText: 'Download All (.zip)',
             clearAllBtnText: 'Clear All',
             optimizationSettingsTitle: "Edit Settings (for selected image or 'Apply to All')",
             dimensionsLabel: 'Dimensions',
             widthLabel: 'Width (px)',
             heightLabel: 'Height (px)',
             maintainRatioLabel: 'Maintain aspect ratio',
             qualityLabel: 'Quality',
             smallerFileText: 'Low',
             betterQualityText: 'High',
             outputFormatLabel: 'Output Format',
             jpgFormatText: 'JPG',
             pngFormatText: 'PNG',
             webpFormatText: 'WEBP',
             originalFormatText: 'Original',
             enhanceLabel: 'Enhance Image (Contrast)',
             featuresTitle: 'Why Use Image Resizer Pro?',
             lightningFastTitle: 'Fast & Efficient',
             lightningFastDescription: 'Quickly process multiple images with optimized backend operations.',
             securePrivateTitle: 'Flexible Controls',
             securePrivateDescription: 'Adjust dimensions, quality, format, and enhance images individually or in bulk.',
             mobileFriendlyTitle: 'Batch Downloads',
             mobileFriendlyDescription: 'Download all your processed images conveniently in a single zip file.',
             footerText: `© <span id="footerYear"></span> Image Resizer Pro. All rights reserved.`,
             footerMadeWithLove: 'Made by Moayad Dughmosh'
         };
        updateTexts(translations);
        document.documentElement.dir = 'ltr';
    }


    // --- File Handling ---

    function handleDragOver(e) { /* Keep existing */
        e.preventDefault(); e.stopPropagation();
        dropzone.classList.add('border-indigo-500', 'dark:border-indigo-400', 'bg-indigo-50', 'dark:bg-gray-700');
     }
    function handleDragLeave(e) { /* Keep existing */
        e.preventDefault(); e.stopPropagation();
        dropzone.classList.remove('border-indigo-500', 'dark:border-indigo-400', 'bg-indigo-50', 'dark:bg-gray-700');
    }
    function handleDrop(e) { /* Keep existing */
        e.preventDefault(); e.stopPropagation(); handleDragLeave(e);
        uploadAndProcessFiles(e.dataTransfer.files);
    }
    function handleFileSelect(e) { /* Keep existing */
        uploadAndProcessFiles(e.target.files); fileInput.value = '';
    }

    function uploadAndProcessFiles(files) {
        if (!files || files.length === 0) return;

        const formData = new FormData();
        const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
        let validFilesCount = 0;
        for (const file of files) {
            if (allowedTypes.includes(file.type) && file.size > 0) { // Added size check
                 formData.append('files', file, file.name);
                 validFilesCount++;
            } else {
                 console.warn(`Skipping unsupported or empty file: ${file.name} (${file.type}, ${file.size} bytes)`);
            }
        }

        if (validFilesCount === 0) {
            showUploadStatus("No supported image files selected.", true);
            return;
        }

        showUploadStatus(`Uploading ${validFilesCount} image(s)... <i class="fas fa-spinner fa-spin ml-2"></i>`);
        setBulkActionsDisabled(true); // Disable buttons during upload

        fetch('/upload', { method: 'POST', body: formData })
        .then(response => {
             // Check for non-OK status and try to parse JSON error
             if (!response.ok) {
                  return response.json().then(errData => {
                      throw new Error(errData.error || `Upload failed: ${response.statusText}`);
                  }).catch(() => { // Catch if response is not JSON
                      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
                  });
             }
             return response.json(); // Parse JSON for successful responses
         })
        .then(data => {
            let message = "";
            let isError = false;
            if (data.uploaded_files && data.uploaded_files.length > 0) {
                addImagesToGrid(data.uploaded_files);
                message = `Successfully uploaded ${data.uploaded_files.length} image(s).`;
                editorSection.classList.remove('hidden');
                 // Select the first image after upload if none selected
                 if (!selectedImageId && uploadedImagesData.length > 0) {
                      selectImage(uploadedImagesData[0].id);
                 } else {
                     updateSharedControlsUI(selectedImageId ? findImageDataById(selectedImageId) : null); // Update controls based on current selection
                 }
            } else {
                isError = true; // No files uploaded, treat as error/warning
            }

            if (data.errors && data.errors.length > 0) {
                 message += ` ${data.errors.length} error(s): ${data.errors.join(', ')}`;
                 isError = true; // Mark as error if any errors occurred
            }
            if (message) {
                showUploadStatus(message, isError, isError ? null : 5000); // Show errors indefinitely, success temporarily
            } else if (!data.uploaded_files || data.uploaded_files.length === 0) {
                 showUploadStatus(data.error || 'Upload completed, but no valid files were processed.', true);
            }

        })
        .catch(error => {
            console.error('Upload Fetch Error:', error);
            showUploadStatus(`Upload Error: ${error.message}`, true);
        })
        .finally(() => {
            setBulkActionsDisabled(false); // Re-enable buttons after upload attempt
            updateBulkActionButtonsState(); // Update state based on result
        });
    }

     function showUploadStatus(message, isError = false, autoHideDelay = null) {
         uploadStatus.innerHTML = message;
         uploadStatus.className = `mt-4 text-sm text-center min-h-[1.25em] ${isError ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`;
         uploadStatus.classList.remove('hidden'); // Make sure it's visible

         if (this.statusTimeout) clearTimeout(this.statusTimeout); // Clear previous timeout

         if (autoHideDelay) {
              this.statusTimeout = setTimeout(() => {
                   uploadStatus.innerHTML = ''; // Clear message
                   uploadStatus.classList.add('hidden');
              }, autoHideDelay);
         }
     }

    function addImagesToGrid(filesInfo) {
        filesInfo.forEach(info => {
            const imageId = `image-${uniqueIdCounter++}`;
             // *** CRITICAL FIX: Use the correct path to the new /uploads/ route ***
             const previewUrl = `/uploads/${encodeURIComponent(info.original_filename)}`;

            const imageData = {
                id: imageId,
                original_filename: info.original_filename,
                previewUrl: previewUrl,
                originalWidth: info.width,
                originalHeight: info.height,
                currentWidth: info.width,
                currentHeight: info.height,
                quality: parseInt(qualityInput.value) || 80,
                format: getSelectedFormat(), // Get default format from UI
                enhance: enhanceCheckbox.checked,
                processedFilename: null,
                processedSizeBytes: null,
                status: 'pending', // pending, processing, done, error
                originalFormat: info.format || 'unknown', // Use format from backend
                originalSizeBytes: info.size_bytes,
                element: null
            };
            uploadedImagesData.push(imageData);

            const thumbElement = createImageThumbnail(imageData);
            imageData.element = thumbElement;
            imageGrid.appendChild(thumbElement);
        });
        updateBulkActionButtonsState(); // Update buttons after adding images
    }

    function createImageThumbnail(imageData) {
        const container = document.createElement('div');
        container.id = imageData.id;
        // Base classes + state classes will be added later
        container.className = 'image-thumbnail-container group flex flex-col justify-between';
        container.dataset.imageId = imageData.id;

        // Image Preview - Use the corrected previewUrl
        const img = document.createElement('img');
        img.src = imageData.previewUrl;
        img.alt = imageData.original_filename;
        img.onerror = () => {
             console.error(`Failed to load preview: ${imageData.previewUrl}`);
             img.alt = `Error loading ${imageData.original_filename}`;
             // Optionally set a placeholder src: img.src = '/static/placeholder.png';
             container.classList.add('border-red-500'); // Indicate loading error
        }
        container.appendChild(img);

         // Info Container Div
         const infoContainer = document.createElement('div');
         infoContainer.className = 'text-center mt-auto pt-1'; // Push info to bottom

         // Filename
         const filenameDiv = document.createElement('div');
         filenameDiv.className = 'image-filename';
         filenameDiv.textContent = imageData.original_filename;
         filenameDiv.title = imageData.original_filename;
         infoContainer.appendChild(filenameDiv);

        // Size Info
         const sizeInfoDiv = document.createElement('div');
         sizeInfoDiv.className = 'image-size-info';
         updateThumbnailSizeInfo(sizeInfoDiv, imageData);
         infoContainer.appendChild(sizeInfoDiv);

         container.appendChild(infoContainer);

        // Download Button
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'download-individual-btn';
        downloadBtn.innerHTML = '<i class="fas fa-download"></i>';
        downloadBtn.title = 'Download processed image';
        downloadBtn.disabled = true;
        downloadBtn.dataset.action = 'download';
        container.appendChild(downloadBtn);

         // Processing Overlay
         const overlay = document.createElement('div');
         overlay.className = 'processing-overlay';
         overlay.innerHTML = '<div class="processing-spinner"></div>';
         container.appendChild(overlay);

        return container;
    }

    function updateThumbnailSizeInfo(element, imageData) { /* Keep existing */
        const origSize = formatBytes(imageData.originalSizeBytes);
        const procSize = imageData.processedSizeBytes ? formatBytes(imageData.processedSizeBytes) : null;
        const dimensions = `${imageData.currentWidth}x${imageData.currentHeight}`;

        let text = `${dimensions} (${origSize})`;
        if (procSize && imageData.status === 'done') {
             text += ` -> ${procSize}`;
        } else if (imageData.status === 'processing') {
             text = `Processing...`; // Simpler text while processing
        } else if (imageData.status === 'error') {
             text += ` (Error)`;
        }
        element.textContent = text;
    }

    function formatBytes(bytes, decimals = 1) { /* Keep existing */
        if (!+bytes) return '0 Bytes'
        const k = 1024; const dm = decimals < 0 ? 0 : decimals; const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

    // --- Image Selection and UI Update ---

     function handleGridClick(e) { /* Keep existing */
          const target = e.target;
          const thumbnail = target.closest('.image-thumbnail-container');
          if (!thumbnail) return;

          const imageId = thumbnail.dataset.imageId;
          const imageData = findImageDataById(imageId);
          if (!imageData) return; // Should not happen

          // Handle download button click
           if (target.closest('.download-individual-btn')) {
               e.stopPropagation(); // Prevent selection
                if (imageData.status === 'done' && imageData.processedFilename) {
                    triggerDownload(`/download/${encodeURIComponent(imageData.processedFilename)}`, imageData.processedFilename);
                } else if (imageData.status !== 'processing'){
                    // If not processing and not done, offer to process it
                    if (confirm("This image hasn't been processed with the current settings. Process now?")) {
                        processImage(imageData).then(() => {
                             // After processing finishes (successfully or not), update state
                             if (imageData.status === 'done' && imageData.processedFilename) {
                                 triggerDownload(`/download/${encodeURIComponent(imageData.processedFilename)}`, imageData.processedFilename);
                             } else if (imageData.status === 'error') {
                                 alert("Processing failed. Cannot download.");
                             }
                        });
                    }
                }
               return;
           }

          // Otherwise, select the image
          selectImage(imageId);
     }

    function selectImage(imageId) {
        if (selectedImageId === imageId) return;

        // Deselect previous
        if (selectedImageId) {
            const previousElement = document.getElementById(selectedImageId);
            if (previousElement) previousElement.classList.remove('thumbnail-selected');
        }

        // Select new
        selectedImageId = imageId;
        const currentElement = document.getElementById(imageId);
        const imageData = findImageDataById(imageId);

        if (currentElement && imageData) {
            currentElement.classList.add('thumbnail-selected');
            updateSharedControls(imageData);
            updateSelectedImageInfo(imageData);
            enableSharedControls(true); // Enable controls for the selected image
        } else {
             selectedImageId = null; // Reset if element/data not found
             updateSharedControls(null); // Reset controls to default/disabled state
             updateSelectedImageInfo(null);
             enableSharedControls(false); // Disable controls
        }
    }

    function findImageDataById(id) { /* Keep existing */
        return uploadedImagesData.find(img => img.id === id);
    }

    function updateSharedControls(imageData) {
        if (imageData) {
            widthInput.value = imageData.currentWidth;
            heightInput.value = imageData.currentHeight;
            qualityInput.value = imageData.quality;
            qualityValue.textContent = `${imageData.quality}%`;
            enhanceCheckbox.checked = imageData.enhance;
            updateFormatButtons(imageData.format);
        } else {
            // Reset to defaults when no image is selected
            widthInput.value = '';
            heightInput.value = '';
            maintainRatioCheckbox.checked = true;
            qualityInput.value = 80;
            qualityValue.textContent = '80%';
            enhanceCheckbox.checked = false;
            updateFormatButtons('jpeg'); // Default to JPG active
        }
    }

    // Function to enable/disable shared controls
     function enableSharedControls(enable) {
         const controls = [widthInput, heightInput, maintainRatioCheckbox, qualityInput, enhanceCheckbox];
         controls.forEach(control => control.disabled = !enable);
         formatButtonsContainer.querySelectorAll('button').forEach(btn => btn.disabled = !enable);
         // If enabling, ensure the correct format button style is applied
         if (enable && selectedImageId) {
             updateFormatButtons(findImageDataById(selectedImageId).format);
         } else if (!enable) {
              // Optionally reset active style when disabling
              updateFormatButtons(null); // Indicate no active format visually
         }
     }


     function updateSelectedImageInfo(imageData) { /* Keep existing */
         if (imageData) {
             let infoHtml = `Selected: <strong class="break-all">${imageData.original_filename}</strong> `; // break-all for long names
             infoHtml += `(${imageData.originalWidth}x${imageData.originalHeight}, ${formatBytes(imageData.originalSizeBytes)}, ${imageData.originalFormat.toUpperCase()})`;
              if (imageData.status === 'done' && imageData.processedSizeBytes !== null) {
                  infoHtml += `<br>Processed: ${imageData.currentWidth}x${imageData.currentHeight}, ${formatBytes(imageData.processedSizeBytes)}, ${imageData.format.toUpperCase()}`;
              } else if (imageData.status === 'processing') {
                   infoHtml += `<br><span class="text-blue-500 dark:text-blue-400">Processing... <i class="fas fa-spinner fa-spin"></i></span>`;
              } else if (imageData.status === 'error') {
                   infoHtml += `<br><span class="text-red-500 dark:text-red-400">Processing Error</span>`;
              } else { // Pending
                   infoHtml += `<br>Pending: ${imageData.currentWidth}x${imageData.currentHeight}, Q${imageData.quality}, ${(imageData.format === 'original' ? `Original (${imageData.originalFormat.toUpperCase()})` : imageData.format.toUpperCase())}`;
              }
             selectedImageInfo.innerHTML = infoHtml;
         } else {
             selectedImageInfo.innerHTML = 'No image selected. Upload images or select one from the grid.';
         }
     }

    // --- Control Handlers (Update State for Selected Image) ---

    function handleDimensionChange() {
        if (!selectedImageId) return;
        const imageData = findImageDataById(selectedImageId);
        if (!imageData) return;

        let width = parseInt(widthInput.value);
        let height = parseInt(heightInput.value);
        const maintainRatio = maintainRatioCheckbox.checked;

        // Avoid processing if input is invalid for now
         if (isNaN(width) || isNaN(height)) return;

        if (maintainRatio) {
             const ratio = imageData.originalWidth / imageData.originalHeight;
             const activeElement = document.activeElement; // Which input was changed?

             if (activeElement === widthInput && width > 0) {
                 height = Math.round(width / ratio);
                 heightInput.value = Math.max(1, height); // Update other input
             } else if (activeElement === heightInput && height > 0) {
                 width = Math.round(height * ratio);
                 widthInput.value = Math.max(1, width); // Update other input
             } else if (width > 0) { // Fallback if triggered differently (e.g., checkbox)
                  height = Math.round(width / ratio);
                  heightInput.value = Math.max(1, height);
             } else if (height > 0) { // Fallback if width is invalid
                  width = Math.round(height * ratio);
                  widthInput.value = Math.max(1, width);
             }
        }

        // Update image data state if dimensions are valid
         if (width > 0 && height > 0) {
             imageData.currentWidth = width;
             imageData.currentHeight = height;
             imageData.status = 'pending'; // Mark as changed
             imageData.processedFilename = null;
             imageData.processedSizeBytes = null;
             updateThumbnailState(imageData); // Update individual thumbnail status/display
             updateSelectedImageInfo(imageData); // Update central info panel
             updateBulkActionButtonsState(); // Check if 'Download All' needs disabling
         }
    }

    function handleQualityChange() { /* Keep existing logic, ensure state update */
        const quality = parseInt(qualityInput.value);
        qualityValue.textContent = `${quality}%`;
        if (!selectedImageId) return;
        const imageData = findImageDataById(selectedImageId);
        if (imageData) {
             imageData.quality = quality;
             imageData.status = 'pending';
             imageData.processedFilename = null;
             imageData.processedSizeBytes = null;
             updateThumbnailState(imageData);
             updateSelectedImageInfo(imageData);
             updateBulkActionButtonsState();
        }
    }

    function handleFormatChange(e) { /* Keep existing logic, ensure state update */
        // Use event delegation from container
        const targetButton = e.target.closest('.format-btn');
        if (!targetButton || targetButton.disabled) return; // Ignore clicks if not on a button or disabled

        const newFormat = targetButton.dataset.format;
        updateFormatButtons(newFormat); // Update UI immediately

        if (!selectedImageId) return;
        const imageData = findImageDataById(selectedImageId);
        if (imageData) {
             imageData.format = newFormat;
             imageData.status = 'pending';
             imageData.processedFilename = null;
             imageData.processedSizeBytes = null;
             updateThumbnailState(imageData);
             updateSelectedImageInfo(imageData);
             updateBulkActionButtonsState();
        }
    }

    function updateFormatButtons(activeFormat) { /* Keep existing logic */
        formatButtonsContainer.querySelectorAll('.format-btn').forEach(btn => {
             const isActive = btn.dataset.format === activeFormat;
             btn.classList.toggle('active', isActive);
             // Adjust explicit styles if needed, though relying on .active class is better
             if (isActive) {
                  btn.classList.remove('bg-gray-100', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-300', 'hover:bg-gray-200', 'dark:hover:bg-gray-600');
             } else {
                  btn.classList.remove('active'); // Ensure removed if not active
                  // Only add back default styles if the button is enabled
                  if (!btn.disabled) {
                        btn.classList.add('bg-gray-100', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-300', 'hover:bg-gray-200', 'dark:hover:bg-gray-600');
                  }
             }
        });
    }

    function getSelectedFormat() { /* Keep existing */
        const activeButton = formatButtonsContainer.querySelector('.format-btn.active');
        return activeButton ? activeButton.dataset.format : 'jpeg';
    }

    function handleEnhanceChange() { /* Keep existing logic, ensure state update */
        const enhance = enhanceCheckbox.checked;
        if (!selectedImageId) return;
        const imageData = findImageDataById(selectedImageId);
        if (imageData) {
             imageData.enhance = enhance;
             imageData.status = 'pending';
             imageData.processedFilename = null;
             imageData.processedSizeBytes = null;
             updateThumbnailState(imageData);
             updateSelectedImageInfo(imageData);
             updateBulkActionButtonsState();
        }
    }

    // --- Processing Logic ---

    function processImage(imageData) {
        // Return a promise for chaining/waiting
        return new Promise((resolve, reject) => {
            if (!imageData || imageData.status === 'processing') {
                 console.warn("Already processing or no image data for:", imageData?.original_filename);
                 return resolve(); // Resolve silently if already processing
            }

            imageData.status = 'processing';
            updateThumbnailState(imageData);
            if (imageData.id === selectedImageId) updateSelectedImageInfo(imageData);
            updateBulkActionButtonsState();

            const payload = {
                filename: imageData.original_filename,
                width: imageData.currentWidth,
                height: imageData.currentHeight,
                quality: imageData.quality,
                format: imageData.format, // Send 'original' if that's the setting
                enhance: imageData.enhance
            };
            console.log("Sending process request:", payload);

            fetch('/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(response => {
                 if (!response.ok) {
                     return response.json().then(err => { throw new Error(err.error || `Processing failed: ${response.statusText}`) });
                 }
                 return response.json();
             })
            .then(data => {
                console.log("Process response:", data);
                if (data.processed_filename && data.original_filename === imageData.original_filename) {
                    imageData.processedFilename = data.processed_filename;
                    imageData.processedSizeBytes = data.processed_size_bytes;
                    imageData.status = 'done';
                    console.log(`Processing success for ${imageData.original_filename}`);
                    resolve(); // Resolve promise on success
                } else {
                     throw new Error(data.error || 'Processing failed: Invalid response');
                }
            })
            .catch(error => {
                console.error('Processing Error for', imageData.original_filename, ':', error);
                imageData.status = 'error';
                imageData.processedFilename = null;
                imageData.processedSizeBytes = null;
                reject(error); // Reject promise on error
            })
            .finally(() => {
                 updateThumbnailState(imageData);
                 if (imageData.id === selectedImageId) updateSelectedImageInfo(imageData);
                 updateBulkActionButtonsState();
            });
        });
    }

    function updateThumbnailState(imageData) { /* Keep existing logic, maybe add status border */
         if (!imageData || !imageData.element) return;

         const container = imageData.element;
         const downloadBtn = container.querySelector('.download-individual-btn');
         const overlay = container.querySelector('.processing-overlay');
         const sizeInfoDiv = container.querySelector('.image-size-info');

         overlay.classList.toggle('visible', imageData.status === 'processing');
         downloadBtn.disabled = !(imageData.status === 'done' && imageData.processedFilename);

         // Update border based on status
         container.classList.remove('thumbnail-status-border-processing', 'thumbnail-status-border-done', 'thumbnail-status-border-error');
         if (imageData.status === 'processing') container.classList.add('thumbnail-status-border-processing');
         else if (imageData.status === 'done') container.classList.add('thumbnail-status-border-done');
         else if (imageData.status === 'error') container.classList.add('thumbnail-status-border-error');

         if(sizeInfoDiv) updateThumbnailSizeInfo(sizeInfoDiv, imageData);
    }

    // --- Bulk Actions ---

    function applySettingsToAllImages() {
         if (uploadedImagesData.length === 0 || isProcessingBatch) return;

         const sharedSettings = {
              width: parseInt(widthInput.value),
              height: parseInt(heightInput.value),
              quality: parseInt(qualityInput.value),
              format: getSelectedFormat(),
              enhance: enhanceCheckbox.checked
         };

         if (isNaN(sharedSettings.width) || sharedSettings.width <= 0 || isNaN(sharedSettings.height) || sharedSettings.height <= 0) {
               alert("Please ensure valid Width and Height are set in the controls before applying to all.");
               return;
          }

         console.log("Applying settings to all:", sharedSettings);
         setButtonLoading(applyToAllBtn, true); // Show loading on apply button
         isProcessingBatch = true;
         updateBulkActionButtonsState(); // Disable other buttons

         // Update state for all images first
         uploadedImagesData.forEach(imageData => {
              let newWidth = sharedSettings.width;
              let newHeight = sharedSettings.height;
              if (maintainRatioCheckbox.checked) {
                   const ratio = imageData.originalWidth / imageData.originalHeight;
                   newHeight = Math.round(newWidth / ratio) || 1; // Ensure at least 1
              }
              imageData.currentWidth = Math.max(1, newWidth);
              imageData.currentHeight = Math.max(1, newHeight);
              imageData.quality = sharedSettings.quality;
              imageData.format = sharedSettings.format;
              imageData.enhance = sharedSettings.enhance;
              imageData.status = 'pending'; // Mark for processing
              imageData.processedFilename = null;
              imageData.processedSizeBytes = null;
              // Don't update thumbnail state here yet, do it during processing loop
         });

         // Now process them
         processAllImages().finally(() => {
             setButtonLoading(applyToAllBtn, false); // Hide loading on apply button
             isProcessingBatch = false;
             updateBulkActionButtonsState(); // Re-enable buttons as needed
             // Update selected image info if one is selected
             if (selectedImageId) updateSelectedImageInfo(findImageDataById(selectedImageId));
         });
    }

     function processAllImages() {
         // Return a promise that settles when all processing attempts are done
         return new Promise((resolve) => {
             const imagesToProcess = uploadedImagesData.filter(img => img.status === 'pending');
             if (imagesToProcess.length === 0) {
                 console.log("No images pending processing.");
                 showUploadStatus("All images up-to-date.", false, 3000);
                 resolve(); // Nothing to do
                 return;
             }

             console.log(`Processing ${imagesToProcess.length} image(s)...`);
             showUploadStatus(`Processing ${imagesToProcess.length} image(s)... <i class="fas fa-spinner fa-spin ml-2"></i>`);

             // Use Promise.allSettled to wait for all, regardless of success/failure
             const processingPromises = imagesToProcess.map(imgData => processImage(imgData));

             Promise.allSettled(processingPromises)
                 .then(results => {
                     const successful = results.filter(r => r.status === 'fulfilled').length;
                     const failed = results.filter(r => r.status === 'rejected').length;
                     console.log(`Batch processing finished. Successful: ${successful}, Failed: ${failed}`);
                     let finalMessage = `Batch processing complete. ${successful} succeeded`;
                     if (failed > 0) {
                          finalMessage += `, ${failed} failed.`;
                          showUploadStatus(finalMessage, true); // Show error message indefinitely
                     } else {
                          showUploadStatus(finalMessage, false, 5000); // Show success message temporarily
                     }
                     resolve(); // Resolve the main promise
                 });
         });
     }


    function downloadAllProcessedImages() {
        if (isProcessingBatch) return;

        const filesToDownload = uploadedImagesData
            .filter(img => img.status === 'done' && img.processedFilename)
            .map(img => img.processedFilename);

        if (filesToDownload.length === 0) {
            // Check if any are pending - if so, offer to process first
            const pendingCount = uploadedImagesData.filter(img => img.status === 'pending').length;
            if (pendingCount > 0 && confirm(`${pendingCount} image(s) need processing. Process them now to include in the download?`)) {
                 isProcessingBatch = true;
                 updateBulkActionButtonsState();
                 setButtonLoading(downloadAllBtn, true, "Processing..."); // Show loading
                 processAllImages().then(() => {
                      // After processing, attempt download again
                      const updatedFiles = uploadedImagesData
                         .filter(img => img.status === 'done' && img.processedFilename)
                         .map(img => img.processedFilename);
                      if (updatedFiles.length > 0) {
                           requestBatchDownload(updatedFiles);
                      } else {
                           alert("Processing finished, but still no files available to download.");
                           setButtonLoading(downloadAllBtn, false); // Reset button
                           isProcessingBatch = false;
                           updateBulkActionButtonsState();
                      }
                 }).catch(() => {
                      alert("Processing failed. Cannot download all.");
                      setButtonLoading(downloadAllBtn, false); // Reset button
                      isProcessingBatch = false;
                      updateBulkActionButtonsState();
                 });

            } else {
                 alert("No successfully processed images available to download.");
            }
            return;
        }

        requestBatchDownload(filesToDownload);
    }

     function requestBatchDownload(filenames) {
         console.log('Requesting batch download for:', filenames);
         showUploadStatus(`Preparing download for ${filenames.length} image(s)...`);
         setButtonLoading(downloadAllBtn, true); // Show loading spinner on button
         isProcessingBatch = true; // Prevent other actions during download prep
         updateBulkActionButtonsState();

         fetch('/download_batch', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ filenames: filenames })
         })
         .then(response => {
             if (!response.ok) {
                  return response.json().then(err => { throw new Error(err.error || `Download failed: ${response.statusText}`) });
              }
              const disposition = response.headers.get('content-disposition');
              let downloadFilename = 'processed_images.zip'; // Default
              if (disposition && disposition.includes('filename=')) {
                  const match = disposition.match(/filename\*?=['"]?([^'";]+)['"]?/);
                  if (match && match[1]) downloadFilename = decodeURIComponent(match[1]);
              }
              return response.blob().then(blob => ({ blob, downloadFilename }));
         })
         .then(({ blob, downloadFilename }) => {
              triggerDownload(URL.createObjectURL(blob), downloadFilename);
              showUploadStatus(`Download ready: ${downloadFilename}`, false, 5000);
         })
         .catch(error => {
             console.error('Batch Download Error:', error);
              showUploadStatus(`Batch Download Error: ${error.message}`, true);
         })
         .finally(() => {
              setButtonLoading(downloadAllBtn, false); // Remove loading spinner
              isProcessingBatch = false;
              updateBulkActionButtonsState();
         });
     }

     function triggerDownload(url, filename) { /* Keep existing */
         const link = document.createElement('a');
         link.href = url;
         link.download = filename || 'download';
         document.body.appendChild(link);
         link.click();
         document.body.removeChild(link);
          if (url.startsWith('blob:')) { URL.revokeObjectURL(url); }
     }


    function clearAllImages() { /* Keep existing, ensure controls are disabled */
         if (uploadedImagesData.length === 0 || isProcessingBatch) return;
          if (!confirm('Are you sure you want to remove all uploaded images and settings?')) return;

        uploadedImagesData = [];
        imageGrid.innerHTML = '';
        selectedImageId = null;
        editorSection.classList.add('hidden');
        updateSharedControls(null); // Reset controls
        enableSharedControls(false); // Disable controls
        updateSelectedImageInfo(null);
        updateBulkActionButtonsState();
        showUploadStatus(''); // Clear status
        fileInput.value = ''; // Clear file input just in case
    }

    // --- UI Helper Functions ---

     function setBulkActionsDisabled(disabled) {
         applyToAllBtn.disabled = disabled;
         downloadAllBtn.disabled = disabled; // Also disable download during upload
         clearAllBtn.disabled = disabled;
     }

     function updateBulkActionButtonsState() {
         const hasImages = uploadedImagesData.length > 0;
         // An image is processing if *any* image has status 'processing' OR if a batch operation is flagged
         const anyImageProcessing = uploadedImagesData.some(img => img.status === 'processing') || isProcessingBatch;
         const hasProcessedFiles = uploadedImagesData.some(img => img.status === 'done' && img.processedFilename);
         const hasPendingFiles = uploadedImagesData.some(img => img.status === 'pending');

         applyToAllBtn.disabled = !hasImages || anyImageProcessing;
         // Enable download if there are processed files OR if there are pending files (will trigger processing)
         downloadAllBtn.disabled = (!hasProcessedFiles && !hasPendingFiles) || anyImageProcessing;
         clearAllBtn.disabled = !hasImages || anyImageProcessing;
     }

    function setButtonLoading(button, isLoading, loadingText = "Processing...") {
         const textSpan = button.querySelector('.button-text');
         const spinner = button.querySelector('.spinner');
         if (!textSpan || !spinner) return; // Safety check

         if (isLoading) {
             button.classList.add('button-loading');
             button.disabled = true; // Ensure disabled while loading
             // Store original text if not already stored
             if (!button.dataset.originalText) {
                 button.dataset.originalText = textSpan.textContent;
             }
             // Optionally change text, e.g., for download button
             if (loadingText && button === downloadAllBtn) textSpan.textContent = loadingText;

         } else {
             button.classList.remove('button-loading');
             // Restore original text
             if (button.dataset.originalText) {
                 textSpan.textContent = button.dataset.originalText;
             }
             // Re-evaluate disabled state based on application logic
             updateBulkActionButtonsState(); // Let this function decide final disabled state
         }
     }

    // Initial UI state update
    function updateSharedControlsUI(imageData) {
         enableSharedControls(!!imageData); // Enable controls only if imageData is provided
         updateSharedControls(imageData); // Populate/reset controls
         updateBulkActionButtonsState(); // Set initial button states
    }

}); // End DOMContentLoaded