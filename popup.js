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