const fileInput = document.getElementById("cer-reference_image");
const dragDropLabel = document.querySelector(".cer-drag-drop-label");

dragDropLabel.addEventListener("dragover", (event) => {
  event.preventDefault();
  dragDropLabel.classList.add("drag-active");
});

dragDropLabel.addEventListener("dragleave", () => {
  dragDropLabel.classList.remove("drag-active");
});

dragDropLabel.addEventListener("drop", (event) => {
  event.preventDefault();
  dragDropLabel.classList.remove("drag-active");

  const uploadedFile = event.dataTransfer.files[0];
  handleFormUpload(uploadedFile);
});

document
  .getElementById("cer-reference_image")
  .addEventListener("change", (event) => {
    const uploadedFile = event.target.files[0];
    handleFormUpload(uploadedFile);
  });

var loading = false;
function changeLoadingState() {
  const loader = document.getElementById("cer-reference_image-status");
  if (!loading) {
    loader.style.display = "block";
    loading = true;
  } else {
    loader.style.display = "none";
    loading = false;
  }
}

async function handleFormUpload(uploadedImage) {
  console.log(uploadedImage)
  if (uploadedImage && uploadedImage.size > 0) {
    try {
      changeLoadingState();

      const imageFormData = new FormData();
      imageFormData.append("file", uploadedImage);
      imageFormData.append("upload_preset", "c7h3fkk1");

      const response = await fetch(
        "https://api.cloudinary.com/v1_1/ds7m5j9j4/image/upload",
        {
          method: "POST",
          body: imageFormData,
          redirect: "follow",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Cloudinary API error: ${response.status} - ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log(data);
      if (data.error) {
        throw new Error(`Cloudinary Error: ${data.error.message}`);
      }

      const dataVariable = document.getElementById("cer-reference_image-data")
      if(dataVariable.value) {
        dataVariable.value += ", " + data.secure_url; 
      } else {
        dataVariable.value = data.secure_url;
      }
      
      const img = document.createElement("img");
      img.src = data.secure_url;
      img.addEventListener("click", function () {
        window.open(img.src, "_blank");
      });
      document.querySelector(".cer-image-preview").append(img);

      changeLoadingState();
    } catch (error) {
      console.warn(error);
      changeLoadingState();
    }
  }
}
document.addEventListener("DOMContentLoaded", function () {
  const successMsg = document.querySelector(".cer-successful-message");

  if (successMsg) {
    // Wait 3 seconds, then fade out
    setTimeout(() => {
      successMsg.classList.add("fade-out");

      // Remove element from DOM after fade-out
      setTimeout(() => {
        successMsg.remove();
      }, 600);
    }, 3000);
  }
});

