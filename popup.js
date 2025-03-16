document.addEventListener('DOMContentLoaded', () => {
    const currentUrlElement = document.getElementById('current-url');
    const loadingElement = document.getElementById('loading');
    const fileListContainer = document.getElementById('file-list-container');
    const fileListElement = document.getElementById('file-list');
    const fileCountElement = document.getElementById('file-count');
    const fileViewerElement = document.getElementById('file-viewer');
    const fileNameElement = document.getElementById('file-name');
    const fileContentElement = document.getElementById('file-content');
    const backButton = document.getElementById('back-btn');
    const downloadFileButton = document.getElementById('download-file');
    const downloadAllButton = document.getElementById('download-all');
    const searchInput = document.getElementById('search-input');
    const categoryButtons = document.querySelectorAll('.category-btn');
    
    let currentUrl = '';
    let allResources = [];
    let filteredResources = [];
    let currentFile = null;
    let currentCategory = 'all';
  
    function init() {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          currentUrl = tabs[0].url;
          currentUrlElement.textContent = currentUrl;
  
          fetchResources();
        }
      });
  
      setupEventListeners();
      
      // Create secret button using the bottom text
      const footerText = document.createElement('div');
      footerText.textContent = 'JamesCoalchi Source Viewer';
      footerText.style.cssText = `
        text-align: center;
        padding: 10px;
        color: #666;
        cursor: default;
        user-select: none;
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: #f5f5f5;
      `;
      
      let clickCount = 0;
      let lastClickTime = 0;
      
      footerText.addEventListener('click', () => {
        const now = Date.now();
        if (now - lastClickTime > 1000) {
          clickCount = 0;
        }
        lastClickTime = now;
        
        clickCount++;
        if (clickCount === 3) {
          showEasterEgg();
          clickCount = 0;
        }
      });
      
      function showEasterEgg() {
        // Create a modal for the Easter egg
        const modal = document.createElement('div');
        modal.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.8);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        `;
        
        // Create YouTube embed
        const videoContainer = document.createElement('div');
        videoContainer.style.cssText = `
          width: 90%;
          max-width: 450px;
          position: relative;
          padding-bottom: 56.25%;
          height: 0;
        `;
        
        const iframe = document.createElement('iframe');
        iframe.src = 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1';
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullscreen = true;
        iframe.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: none;
          border-radius: 8px;
        `;
        
        videoContainer.appendChild(iframe);
        
        // Add a close button
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.style.cssText = `
          margin-top: 20px;
          padding: 8px 16px;
          background-color: var(--primary-color);
          color: white;
          border: none;
          border-radius: 20px;
          cursor: pointer;
          font-weight: 500;
        `;
        
        closeButton.addEventListener('click', () => {
          document.body.removeChild(modal);
        });
        
        modal.appendChild(videoContainer);
        modal.appendChild(closeButton);
        document.body.appendChild(modal);
      }
      
      document.body.appendChild(footerText);
    }
  
    function setupEventListeners() {
      backButton.addEventListener('click', showFileList);
      
      downloadFileButton.addEventListener('click', () => {
        if (currentFile) {
          downloadFile(currentFile);
        }
      });
      
      downloadAllButton.addEventListener('click', downloadAllFiles);
      
      searchInput.addEventListener('input', filterResources);
      
      categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
          categoryButtons.forEach(btn => btn.classList.remove('active'));
          button.classList.add('active');
          currentCategory = button.dataset.category;
          filterResources();
        });
      });
    }
  
    function fetchResources() {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || !tabs[0] || !tabs[0].id) {
          console.error('Could not get current tab ID');
          loadingElement.textContent = 'Error: Could not access the current tab';
          return;
        }
        
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          function: getAllResources
        }, (results) => {
          if (results && results[0] && results[0].result) {
            allResources = results[0].result;
            filteredResources = [...allResources];
            
            updateFileCount();
            renderFileList();
            
            loadingElement.style.display = 'none';
            fileListContainer.style.display = 'flex';
          } else {
            console.error('Error executing script or no results returned');
            loadingElement.textContent = 'Error: Could not retrieve website resources';
          }
        });
      });
    }
    
    function getAllResources() {
      const resources = [];
      
      const scripts = document.querySelectorAll('script[src]');
      scripts.forEach(script => {
        if (script.src) {
          resources.push({
            url: script.src,
            type: 'js',
            filename: script.src.split('/').pop() || 'script.js'
          });
        }
      });
      
      const styles = document.querySelectorAll('link[rel="stylesheet"]');
      styles.forEach(style => {
        if (style.href) {
          resources.push({
            url: style.href,
            type: 'css',
            filename: style.href.split('/').pop() || 'style.css'
          });
        }
      });
      
      const images = document.querySelectorAll('img[src]');
      images.forEach(img => {
        if (img.src) {
          resources.push({
            url: img.src,
            type: 'img',
            filename: img.src.split('/').pop() || 'image.png'
          });
        }
      });
      
      resources.push({
        url: window.location.href,
        type: 'html',
        filename: 'index.html',
        content: document.documentElement.outerHTML
      });
      
      const otherLinks = document.querySelectorAll('link:not([rel="stylesheet"])');
      otherLinks.forEach(link => {
        if (link.href) {
          resources.push({
            url: link.href,
            type: 'other',
            filename: link.href.split('/').pop() || 'resource'
          });
        }
      });
      
      return resources;
    }
    
    function updateFileCount() {
      fileCountElement.textContent = `${filteredResources.length} files found`;
    }
    
    function renderFileList() {
      fileListElement.innerHTML = '';
      
      filteredResources.forEach(resource => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        
        const fileInfo = document.createElement('div');
        fileInfo.className = 'file-info';
        
        const fileName = document.createElement('div');
        fileName.className = 'file-name';
        fileName.textContent = resource.filename;
        
        const filePath = document.createElement('div');
        filePath.className = 'file-path';
        filePath.textContent = resource.url;
        
        fileInfo.appendChild(fileName);
        fileInfo.appendChild(filePath);
        
        const fileActions = document.createElement('div');
        fileActions.className = 'file-actions';
        
        const viewBtn = document.createElement('button');
        viewBtn.className = 'view-btn';
        viewBtn.textContent = 'View';
        viewBtn.addEventListener('click', () => viewFile(resource));
        
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'download-btn';
        downloadBtn.textContent = 'Download';
        downloadBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          downloadFile(resource);
        });
        
        fileActions.appendChild(viewBtn);
        fileActions.appendChild(downloadBtn);
        
        fileItem.appendChild(fileInfo);
        fileItem.appendChild(fileActions);
        
        fileListElement.appendChild(fileItem);
      });
    }
    
    function filterResources() {
      const searchTerm = searchInput.value.toLowerCase();
      
      filteredResources = allResources.filter(resource => {
        const matchesSearch = resource.filename.toLowerCase().includes(searchTerm) || 
                             resource.url.toLowerCase().includes(searchTerm);
        
        const matchesCategory = currentCategory === 'all' || resource.type === currentCategory;
        
        return matchesSearch && matchesCategory;
      });
      
      updateFileCount();
      renderFileList();
    }
    
    function viewFile(resource) {
      currentFile = resource;
      fileNameElement.textContent = resource.filename;
      
      fileContentElement.innerHTML = '<div class="spinner"></div>';
      fileListContainer.style.display = 'none';
      fileViewerElement.style.display = 'flex';
      
      if (resource.content) {
        displayFileContent(resource.content);
        return;
      }
      
      fetch(resource.url)
        .then(response => {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          
          if (resource.type === 'img') {
            return response.blob().then(blob => {
              const reader = new FileReader();
              reader.onload = () => {
                const img = document.createElement('img');
                img.src = reader.result;
                fileContentElement.innerHTML = '';
                fileContentElement.appendChild(img);
              };
              reader.readAsDataURL(blob);
              return null;
            });
          }
          
          return response.text();
        })
        .then(content => {
          if (content) {
            displayFileContent(content);
          }
        })
        .catch(error => {
          console.error('Error fetching file:', error);
          displayFileContent(`Error loading file: ${error.message}`);
        });
    }
    
    function displayFileContent(content) {
      currentFile.content = content;
      
      fileContentElement.textContent = content;
      
      // TODO:
      // Add syntax highlighting :D
      
      fileListContainer.style.display = 'none';
      fileViewerElement.style.display = 'flex';
    }
    
    function showFileList() {
      fileViewerElement.style.display = 'none';
      fileListContainer.style.display = 'flex';
    }
    
    function downloadFile(resource) {
      if (resource.content) {
        const blob = new Blob([resource.content], { type: getMimeType(resource.type) });
        downloadBlob(blob, resource.filename);
        return;
      }
      
      fetch(resource.url)
        .then(response => response.blob())
        .then(blob => {
          downloadBlob(blob, resource.filename);
        })
        .catch(error => {
          console.error('Error downloading file:', error);
          alert(`Error downloading file: ${error.message}`);
        });
    }
    
    function downloadAllFiles() {
      const zip = new JSZip();
      const promises = [];
      
      filteredResources.forEach(resource => {
        if (resource.content) {
          zip.file(resource.filename, resource.content);
          return;
        }
        
        const promise = fetch(resource.url)
          .then(response => response.blob())
          .then(blob => {
            zip.file(resource.filename, blob);
          })
          .catch(error => {
            console.error(`Error adding ${resource.filename} to ZIP:`, error);
          });
        
        promises.push(promise);
      });
      
      Promise.all(promises)
        .then(() => {
          return zip.generateAsync({ type: 'blob' });
        })
        .then(blob => {
          const hostname = new URL(currentUrl).hostname;
          const zipFilename = `${hostname}-source-code.zip`;
          downloadBlob(blob, zipFilename);
        })
        .catch(error => {
          console.error('Error creating ZIP file:', error);
          alert(`Error creating ZIP file: ${error.message}`);
        });
    }
    
    function downloadBlob(blob, filename) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    
    function getMimeType(type) {
      switch (type) {
        case 'html': return 'text/html';
        case 'css': return 'text/css';
        case 'js': return 'application/javascript';
        case 'img': return 'image/png';
        default: return 'application/octet-stream';
      }
    }
    
    init();
  });
