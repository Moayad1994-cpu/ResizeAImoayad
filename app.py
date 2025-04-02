from flask import Flask, request, jsonify, send_file, render_template, send_from_directory
from PIL import Image, ImageEnhance, UnidentifiedImageError
import io
import os
import uuid # For unique filenames
import zipfile # For batch downloads
import logging # For logging errors

app = Flask(__name__)

# --- Configuration ---
UPLOAD_FOLDER = 'uploads'
PROCESSED_FOLDER = 'processed'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'gif'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['PROCESSED_FOLDER'] = PROCESSED_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50 MB limit per request

# Setup basic logging
logging.basicConfig(level=logging.INFO)
app.logger.setLevel(logging.INFO)

# Create directories if they don't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PROCESSED_FOLDER, exist_ok=True)

def allowed_file(filename):
    """Checks if the filename has an allowed extension."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# --- Helper Function for Image Processing ---
def process_single_image(input_path, output_folder, desired_width, desired_height, quality, output_format, enhance):
    """Processes a single image and saves it."""
    try:
        app.logger.info(f"Processing image: {input_path}")
        image = Image.open(input_path)

        # --- Format Conversion & Alpha Handling ---
        fmt = output_format.upper()
        original_mode = image.mode
        app.logger.info(f"Original mode: {original_mode}, Target format: {fmt}")

        # Convert indexed color (like GIF) before potential resizing/enhancing
        if image.mode == 'P':
             # Convert to RGBA first to preserve transparency if possible
             image = image.convert('RGBA')
             app.logger.info("Converted P mode to RGBA")
             original_mode = 'RGBA' # Update mode after conversion


        # Handle formats that don't support alpha (like JPEG)
        if fmt == 'JPEG' and original_mode in ('RGBA', 'LA'):
            app.logger.info(f"Converting {original_mode} to RGB for JPEG output.")
            # Create a white background
            background = Image.new("RGB", image.size, (255, 255, 255))
            # Paste the image using its alpha channel as mask
            try:
                # Try using alpha channel directly if available after potential P->RGBA conversion
                 mask = image.split()[-1] # Get alpha channel
                 if mask.mode == 'L' or mask.mode == '1': # Check if it's a valid mask
                      background.paste(image, (0, 0), mask)
                      image = background
                      app.logger.info("Pasted RGBA/LA image onto white background for JPEG.")
                 else:
                      app.logger.warning(f"Unexpected mask mode '{mask.mode}' during JPEG conversion. Converting without mask.")
                      image = image.convert('RGB')
            except Exception as e:
                 app.logger.warning(f"Error using alpha mask for JPEG: {e}. Converting directly.")
                 image = image.convert('RGB')

        elif image.mode != 'RGB' and fmt in ('JPEG', 'WEBP'): # Some WEBP variants might need RGB
            # If not JPEG needing alpha flattening, just convert if necessary
             if image.mode != 'RGB': # Avoid unnecessary conversion
                  try:
                       image = image.convert('RGB')
                       app.logger.info(f"Converted image mode {original_mode} to RGB for {fmt}.")
                  except Exception as e:
                      app.logger.error(f"Error converting image mode {original_mode} to RGB: {e}")
                      raise # Re-raise the exception

        # --- Resizing ---
        img_width, img_height = image.size
        target_width = desired_width if desired_width > 0 else img_width
        target_height = desired_height if desired_height > 0 else img_height

        if (target_width != img_width or target_height != img_height):
            app.logger.info(f"Resizing from {img_width}x{img_height} to {target_width}x{target_height}")
            image.thumbnail((target_width, target_height), Image.Resampling.LANCZOS)
            app.logger.info(f"Resized to {image.size[0]}x{image.size[1]}")


        # --- Enhancing ---
        if enhance:
            try:
                enhancer = ImageEnhance.Contrast(image)
                image = enhancer.enhance(1.2) # Subtle contrast enhancement
                app.logger.info("Applied contrast enhancement.")
            except ValueError as e:
                app.logger.warning(f"Could not enhance image {os.path.basename(input_path)}: {e}")


        # --- Saving ---
        output_buffer = io.BytesIO()
        save_params = {}

        if fmt in ('JPEG', 'WEBP'):
            save_params['quality'] = quality
            if fmt == 'WEBP':
                save_params['lossless'] = False # Or True based on needs
        elif fmt == 'PNG':
             # PNG quality is compression level (0-9), higher value = more compression = smaller file
             # Map 0-100 quality to 9-0 compression approx.
             save_params['compress_level'] = max(0, min(9, 9 - (quality // 10)))
             app.logger.info(f"Using PNG compress_level: {save_params['compress_level']} (Quality: {quality})")
        # Add other format options if needed (e.g., GIF)


        image.save(output_buffer, format=fmt, **save_params)
        output_buffer.seek(0)
        processed_size_bytes = output_buffer.getbuffer().nbytes
        app.logger.info(f"Image saved to buffer. Format: {fmt}, Size: {processed_size_bytes} bytes")


        # --- Generate Unique Filename ---
        original_filename = os.path.basename(input_path)
        base, _ = os.path.splitext(original_filename)
        unique_id = uuid.uuid4()
        # Ensure extension matches the output format
        processed_filename = f"{base}_{unique_id}.{fmt.lower()}"
        processed_file_path = os.path.join(output_folder, processed_filename)

        with open(processed_file_path, 'wb') as f:
            f.write(output_buffer.getvalue())
        app.logger.info(f"Processed image saved to: {processed_file_path}")

        return processed_filename, processed_file_path, processed_size_bytes

    except FileNotFoundError:
        app.logger.error(f"Input file not found at {input_path}")
        return None, None, None
    except UnidentifiedImageError:
        app.logger.error(f"Cannot identify image file {input_path}. It might be corrupted or unsupported.")
        return None, None, None
    except Exception as e:
        app.logger.exception(f"Error processing image {input_path}: {e}") # Log full traceback
        return None, None, None

# --- Routes ---

@app.route('/')
def index():
    """Serves the main HTML page."""
    return render_template('index.html')

@app.route('/favicon.ico')
def favicon():
    """Serves the favicon."""
    # Ensure you have 'favicon.ico' in your 'static' folder
    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'favicon.ico', mimetype='image/vnd.microsoft.icon')

# --- THIS IS THE NEW ROUTE FOR PREVIEWS ---
@app.route('/uploads/<path:filename>')
def get_upload_file(filename):
    """Serves an uploaded file for previews."""
    # SECURITY: Basic path traversal check
    if '..' in filename or filename.startswith('/'):
        app.logger.warning(f"Attempted path traversal: {filename}")
        return jsonify({'error': 'Invalid filename'}), 400
    try:
        app.logger.debug(f"Serving uploaded file: {filename} from {app.config['UPLOAD_FOLDER']}")
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename, as_attachment=False)
    except FileNotFoundError:
        app.logger.error(f"Uploaded file not found: {filename}")
        return jsonify({'error': 'File not found'}), 404
# --------------------------------------------

@app.route('/upload', methods=['POST'])
def upload_file_route():
    """Handles multiple file uploads."""
    if 'files' not in request.files:
        app.logger.warning("Upload attempt with no 'files' part in request.")
        return jsonify({'error': 'No file part'}), 400

    files = request.files.getlist('files')
    uploaded_files_info = []
    errors = []
    app.logger.info(f"Received {len(files)} file(s) for upload.")

    for file in files:
        if file.filename == '':
            app.logger.info("Skipping empty filename.")
            continue # Skip empty filenames

        if file and allowed_file(file.filename):
            # Using original filename directly - consider secure_filename in production
            filename = file.filename
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            app.logger.info(f"Processing uploaded file: {filename}")

            try:
                file.save(file_path)
                # Get basic image info (size, dimensions, format)
                with Image.open(file_path) as img:
                    width, height = img.size
                    img_format = img.format if img.format else 'unknown'
                size_bytes = os.path.getsize(file_path)

                uploaded_files_info.append({
                    'original_filename': filename,
                    'width': width,
                    'height': height,
                    'format': img_format.lower(),
                    'size_bytes': size_bytes
                })
                app.logger.info(f"Successfully saved and read info for {filename} ({width}x{height}, {size_bytes} bytes, {img_format})")

            except UnidentifiedImageError:
                 errors.append(f"Cannot read image: {filename}. File might be corrupt or type not supported by PIL.")
                 app.logger.warning(f"UnidentifiedImageError for {filename}")
                 # Clean up invalid file
                 if os.path.exists(file_path): os.remove(file_path)
            except Exception as e:
                errors.append(f"Error saving or reading file {filename}: {e}")
                app.logger.exception(f"Exception during upload for {filename}: {e}")
                if os.path.exists(file_path): os.remove(file_path) # Clean up failed save

        elif file:
            errors.append(f"File type not allowed: {file.filename}")
            app.logger.warning(f"Disallowed file type uploaded: {file.filename}")

    status_code = 200
    response_data = {}

    if not uploaded_files_info and errors:
         response_data = {'error': 'Upload failed. See details.', 'details': errors}
         status_code = 400
         app.logger.error(f"Upload failed entirely. Errors: {errors}")
    elif errors:
         response_data = {'message': 'Files uploaded with some errors.', 'uploaded_files': uploaded_files_info, 'errors': errors}
         status_code = 207 # Multi-Status
         app.logger.warning(f"Upload completed with errors. Success: {len(uploaded_files_info)}, Errors: {errors}")
    elif not uploaded_files_info:
         response_data = {'error': 'No valid image files were uploaded or processed.'}
         status_code = 400
         app.logger.warning("Upload request contained no valid/allowed files.")
    else:
        response_data = {'message': 'Files uploaded successfully', 'uploaded_files': uploaded_files_info}
        app.logger.info(f"Upload successful for {len(uploaded_files_info)} files.")

    return jsonify(response_data), status_code


@app.route('/process', methods=['POST'])
def process_image_route():
    """Processes a single image based on provided parameters."""
    data = request.json
    original_filename = data.get('filename')
    width = int(data.get('width', 0))
    height = int(data.get('height', 0))
    quality = int(data.get('quality', 80))
    format_req = data.get('format', 'original').lower() # Get requested format
    enhance = data.get('enhance', False)

    app.logger.info(f"Processing request for: {original_filename}, Size: {width}x{height}, Quality: {quality}, Format: {format_req}, Enhance: {enhance}")


    if not original_filename:
        app.logger.error("Processing request missing filename.")
        return jsonify({'error': 'Filename missing'}), 400

    # SECURITY: Basic path traversal check on input filename too
    if '..' in original_filename or original_filename.startswith('/'):
        app.logger.error(f"Invalid filename received for processing: {original_filename}")
        return jsonify({'error': 'Invalid filename'}), 400

    file_path = os.path.join(app.config['UPLOAD_FOLDER'], original_filename)
    if not os.path.exists(file_path):
        app.logger.error(f"File to process not found: {file_path}")
        return jsonify({'error': f'File not found: {original_filename}'}), 404

    # Determine actual output format
    output_format = format_req
    if output_format == 'original':
         try:
              # Reliably get original format using PIL
              with Image.open(file_path) as img:
                   original_pil_format = img.format
                   if original_pil_format:
                        output_format = original_pil_format.lower()
                        app.logger.info(f"Determined original format as: {output_format}")
                   else:
                        # Fallback if PIL can't determine format (rare)
                        ext = os.path.splitext(original_filename)[1].lower().strip('.')
                        if ext in ALLOWED_EXTENSIONS:
                             output_format = ext
                             app.logger.warning(f"PIL couldn't determine format, using extension: {output_format}")
                        else:
                             output_format = 'jpeg' # Ultimate fallback
                             app.logger.warning("Could not determine original format, falling back to JPEG.")
         except Exception as e:
              output_format = 'jpeg' # Fallback on any error reading original
              app.logger.exception(f"Error reading original image to determine format, falling back to JPEG: {e}")

    # Validate the determined format against PIL's savers
    if output_format.upper() not in Image.SAVE:
         app.logger.warning(f"Determined/requested format '{output_format}' is not supported for saving by PIL. Falling back to JPEG.")
         output_format = 'jpeg'


    processed_filename, processed_path, processed_size_bytes = process_single_image(
        input_path=file_path,
        output_folder=app.config['PROCESSED_FOLDER'],
        desired_width=width,
        desired_height=height,
        quality=quality,
        output_format=output_format, # Use the determined, validated format
        enhance=enhance
    )

    if processed_filename:
        app.logger.info(f"Successfully processed {original_filename} into {processed_filename}")
        return jsonify({
            'message': 'Image processed successfully',
            'original_filename': original_filename, # Send back original for mapping in JS
            'processed_filename': processed_filename, # The new unique name
            'processed_size_bytes': processed_size_bytes
        })
    else:
        app.logger.error(f"Processing failed for {original_filename}")
        return jsonify({'error': f'Failed to process image: {original_filename}'}), 500


@app.route('/processed/<path:filename>')
def get_processed_file(filename):
    """Serves a processed image file (e.g., for direct viewing/linking)."""
    if '..' in filename or filename.startswith('/'):
         app.logger.warning(f"Attempted path traversal on processed file: {filename}")
         return jsonify({'error': 'Invalid filename'}), 400
    try:
         app.logger.debug(f"Serving processed file: {filename} from {app.config['PROCESSED_FOLDER']}")
         return send_from_directory(app.config['PROCESSED_FOLDER'], filename, as_attachment=False)
    except FileNotFoundError:
         app.logger.error(f"Processed file not found: {filename}")
         return jsonify({'error': 'File not found'}), 404

@app.route('/download/<path:filename>')
def download_processed_file(filename):
    """Downloads a specific processed image file."""
    if '..' in filename or filename.startswith('/'):
         app.logger.warning(f"Attempted path traversal on download: {filename}")
         return jsonify({'error': 'Invalid filename'}), 400
    try:
        app.logger.info(f"Processing download request for: {filename}")
        return send_from_directory(app.config['PROCESSED_FOLDER'], filename, as_attachment=True)
    except FileNotFoundError:
        app.logger.error(f"File to download not found: {filename}")
        return jsonify({'error': 'File not found'}), 404


@app.route('/download_batch', methods=['POST'])
def download_batch():
    """Creates a zip file of multiple processed images and sends it."""
    data = request.json
    processed_filenames = data.get('filenames')

    if not isinstance(processed_filenames, list) or not processed_filenames:
        app.logger.error("Batch download request received without valid 'filenames' list.")
        return jsonify({'error': 'No filenames provided or invalid format for batch download'}), 400

    app.logger.info(f"Processing batch download request for {len(processed_filenames)} files.")

    memory_file = io.BytesIO()
    zip_filename = f"processed_images_{uuid.uuid4()}.zip"
    files_added_count = 0
    processed_folder = app.config['PROCESSED_FOLDER']

    try:
        with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
            for filename in processed_filenames:
                # SECURITY: Basic validation again
                if not filename or '..' in filename or filename.startswith('/'):
                    app.logger.warning(f"Skipping invalid filename in batch: {filename}")
                    continue

                file_path = os.path.join(processed_folder, filename)
                if os.path.exists(file_path) and os.path.isfile(file_path):
                    zf.write(file_path, arcname=filename) # Use arcname to keep filename clean in zip
                    files_added_count += 1
                    app.logger.debug(f"Added to zip: {filename}")
                else:
                    app.logger.warning(f"File not found for batch download: {filename} at {file_path}")
    except Exception as e:
         app.logger.exception(f"Error creating zip file: {e}")
         return jsonify({'error': 'Failed to create zip file.'}), 500

    memory_file.seek(0)

    if files_added_count == 0:
         app.logger.error("Batch download requested, but no valid files were found to include.")
         return jsonify({'error': 'None of the requested files were found for download'}), 404

    app.logger.info(f"Sending zip file '{zip_filename}' containing {files_added_count} files.")
    return send_file(
        memory_file,
        mimetype='application/zip',
        as_attachment=True,
        download_name=zip_filename
    )

if __name__ == '__main__':
    # For development: host='0.0.0.0' makes it accessible on your network
    # Use debug=False in production and run with a proper WSGI server (gunicorn, waitress)
    app.run(debug=True, host='0.0.0.0', port=5000)