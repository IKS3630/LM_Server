// Variables globales
let conversationHistory = [];
let conversations = [];
let currentConversationId = null;
let isGenerating = false;
let serverUrl = 'http://10.30.3.188:1234';
let isConnected = false;
let currentFile = null;

// Configuration de marked
marked.setOptions({
    gfm: true,
    breaks: true,
    headerIds: true,
    mangle: false,
    sanitize: false,
    highlight: function(code, lang) {
        return code;
    }
});

// Fonctions de gestion des fichiers
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
        currentFile = file;
        showFilePreview(file);
    } else {
        alert('Veuillez sélectionner un fichier PDF valide.');
        event.target.value = '';
    }
}

function showFilePreview(file) {
    const previewContainer = document.getElementById('filePreview');
    previewContainer.innerHTML = `
        <div class="file-preview">
            <span>${file.name}</span>
            <span class="remove-file" onclick="removeFile()">×</span>
        </div>
    `;
}

function removeFile() {
    currentFile = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('filePreview').innerHTML = '';
}

function addFileMessage(fileName, fileData) {
    const chatHistory = document.getElementById('chatHistory');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user-message file-message';
    
    const fileLink = document.createElement('a');
    fileLink.href = fileData;
    fileLink.download = fileName;
    fileLink.textContent = fileName;
    fileLink.target = '_blank';

    const fileIcon = document.createElement('span');
    fileIcon.innerHTML = '📎';
    
    messageDiv.appendChild(fileIcon);
    messageDiv.appendChild(fileLink);
    chatHistory.appendChild(messageDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function loadFromLocalStorage() {
    const savedConversations = localStorage.getItem('conversations');
    if (savedConversations) {
        conversations = JSON.parse(savedConversations);
        if (conversations.length > 0) {
            currentConversationId = conversations[conversations.length - 1].id;
        }
    } else {
        conversations = [];
    }

    const savedServerUrl = localStorage.getItem('serverUrl');
    if (savedServerUrl) {
        serverUrl = savedServerUrl;
        document.getElementById('serverUrl').value = serverUrl;
    }
}

function saveToLocalStorage() {
    localStorage.setItem('conversations', JSON.stringify(conversations));
    localStorage.setItem('serverUrl', serverUrl);
}

function renderConversations() {
    const conversationsContainer = document.getElementById('conversations');
    conversationsContainer.innerHTML = '';

    conversations.forEach(conv => {
        const convDiv = document.createElement('div');
        convDiv.className = 'conversation-item';
        if (conv.id === currentConversationId) {
            convDiv.classList.add('active');
        }

        const titleSpan = document.createElement('span');
        titleSpan.className = 'conversation-title';
        titleSpan.textContent = conv.title || `Conversation du ${new Date(conv.date).toLocaleString()}`;
        titleSpan.onclick = () => loadConversation(conv.id);

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'conversation-actions';

        const renameButton = document.createElement('button');
        renameButton.className = 'action-button';
        renameButton.textContent = 'Rename';
        renameButton.onclick = (e) => {
            e.stopPropagation();
            renameConversation(conv.id);
        };

        const deleteButton = document.createElement('button');
        deleteButton.className = 'action-button';
        deleteButton.textContent = 'Delete';
        deleteButton.onclick = (e) => {
            e.stopPropagation();
            deleteConversation(conv.id);
        };

        actionsDiv.appendChild(renameButton);
        actionsDiv.appendChild(deleteButton);

        convDiv.appendChild(titleSpan);
        convDiv.appendChild(actionsDiv);
        conversationsContainer.appendChild(convDiv);
    });
}

function startNewConversation() {
    currentConversationId = 'conv_' + Date.now();
    conversationHistory = [];
    document.getElementById('chatHistory').innerHTML = '';
    conversations.push({
        id: currentConversationId,
        date: Date.now(),
        messages: [],
        title: 'Nouvelle conversation'
    });
    saveToLocalStorage();
    renderConversations();
    enableInput();
    updateCurrentConversationTitle();
}

function loadConversation(convId) {
    const conversation = conversations.find(c => c.id === convId);
    if (conversation) {
        currentConversationId = convId;
        conversationHistory = conversation.messages;
        document.getElementById('chatHistory').innerHTML = '';
        conversation.messages.forEach(msg => {
            if(msg.file) {
                addFileMessage(msg.file.name, msg.file.data);
            }
            if(msg.content && !msg.content.startsWith('[Fichier joint:')) {
                addMessageToHistory(msg.content, msg.role);
            }
        });
        renderConversations();
        enableInput();
        updateCurrentConversationTitle();
    }
}

function updateCurrentConversationTitle() {
    const titleBar = document.getElementById('currentConversationTitle');
    const currentConversation = conversations.find(c => c.id === currentConversationId);
    if (currentConversation) {
        titleBar.textContent = currentConversation.title || `Conversation du ${new Date(currentConversation.date).toLocaleString()}`;
    } else {
        titleBar.textContent = 'Nouvelle conversation';
    }
}

function saveCurrentConversation() {
    const conversation = conversations.find(c => c.id === currentConversationId);
    if (conversation) {
        conversation.messages = conversationHistory;
        if (!conversation.title && conversationHistory.length > 0) {
            const firstMessage = conversationHistory[0].content;
            conversation.title = firstMessage.startsWith('[Fichier joint:') ? 
                'Conversation avec fichier' : 
                firstMessage.substring(0, 30) + '...';
        }
        saveToLocalStorage();
        renderConversations();
        updateCurrentConversationTitle();
    }
}

function renameConversation(convId) {
    const conversation = conversations.find(c => c.id === convId);
    if (conversation) {
        const newTitle = prompt("Entrez un nouveau titre pour la conversation:", conversation.title);
        if (newTitle !== null && newTitle.trim() !== "") {
            conversation.title = newTitle.trim();
            saveToLocalStorage();
            renderConversations();
            if (convId === currentConversationId) {
                updateCurrentConversationTitle();
            }
        }
    }
}

function deleteConversation(convId) {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette conversation ?")) {
        const index = conversations.findIndex(c => c.id === convId);
        if (index > -1) {
            conversations.splice(index, 1);
            saveToLocalStorage();
            if (convId === currentConversationId) {
                if (conversations.length > 0) {
                    loadConversation(conversations[conversations.length - 1].id);
                } else {
                    currentConversationId = null;
                    conversationHistory = [];
                    document.getElementById('chatHistory').innerHTML = '';
                    startNewConversation();
                }
            }
            renderConversations();
        }
    }
}

function disableInput() {
    isGenerating = true;
    document.getElementById('chatInput').disabled = true;
    document.getElementById('sendButton').disabled = true;
    document.getElementById('newConversationButton').disabled = true;
    document.getElementById('fileInput').disabled = true;
}

function enableInput() {
    isGenerating = false;
    document.getElementById('chatInput').disabled = false;
    document.getElementById('sendButton').disabled = false;
    document.getElementById('newConversationButton').disabled = false;
    document.getElementById('fileInput').disabled = false;
}

function addMessageToHistory(message, role) {
    const chatHistory = document.getElementById('chatHistory');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;
    
    if (role === 'assistant') {
        const markdownContent = document.createElement('div');
        markdownContent.className = 'markdown-content';
        const htmlContent = marked.parse(message);
        markdownContent.innerHTML = htmlContent;
        messageDiv.appendChild(markdownContent);
    } else {
        messageDiv.textContent = message;
    }
    
    chatHistory.appendChild(messageDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function showTypingIndicator() {
    const chatHistory = document.getElementById('chatHistory');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.id = 'typingIndicator';
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.className = 'typing-dot';
        typingDiv.appendChild(dot);
    }
    chatHistory.appendChild(typingDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function removeTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

async function sendChatMessage() {
    const message = document.getElementById('chatInput').value.trim();
    if ((!message && !currentFile) || isGenerating) return;

    disableInput();
    showTypingIndicator();

    // Gérer le fichier s'il y en a un
    if (currentFile) {
        const reader = new FileReader();
        reader.onload = async function(e) {
            const fileData = e.target.result;
            addFileMessage(currentFile.name, fileData);
            
            const fileMessage = {
                role: "user",
                content: `[Fichier joint: ${currentFile.name}]`,
                file: {
                    name: currentFile.name,
                    data: fileData
                }
            };
            conversationHistory.push(fileMessage);
            
            // Envoyer le message texte s'il y en a un
            if (message) {
                addMessageToHistory(message, 'user');
                const userMessage = {
                    role: "user",
                    content: message
                };
                conversationHistory.push(userMessage);
            }

            // Envoyer la requête au serveur
            await sendToServer();
        };
        reader.readAsDataURL(currentFile);
        removeFile();
    } else if (message) {
        // Envoyer uniquement le message texte
        addMessageToHistory(message, 'user');
        const userMessage = {
            role: "user",
            content: message
        };
        conversationHistory.push(userMessage);
        await sendToServer();
    }

    document.getElementById('chatInput').value = '';
    enableInput();
}

async function sendToServer() {
    const payload = {
        messages: conversationHistory,
        model: "local-model",
        temperature: 0.7
    };

    try {
        const response = await fetch(`${serverUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        removeTypingIndicator();
        const content = data.choices[0].message.content;
        
        const assistantMessage = {
            role: "assistant",
            content: content
        };
        
        conversationHistory.push(assistantMessage);
        addMessageToHistory(content, 'assistant');
        saveCurrentConversation();
        updateConnectionStatus(true);
    } catch (error) {
        removeTypingIndicator();
        addMessageToHistory(`Erreur: ${error.message}`, 'assistant');
        updateConnectionStatus(false);
    }
}

async function checkConnection() {
    try {
        const response = await fetch(`${serverUrl}/v1/models`, { method: 'GET' });
        updateConnectionStatus(response.ok);
    } catch (error) {
        updateConnectionStatus(false);
    }
}

function updateConnectionStatus(connected) {
    const statusIndicator = document.getElementById('connectionStatus');
    isConnected = connected;
    if (connected) {
        statusIndicator.className = 'connected';
        statusIndicator.title = 'Connecté';
        enableInput();
    } else {
        statusIndicator.className = 'disconnected';
        statusIndicator.title = 'Déconnecté';
        disableInput();
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    loadFromLocalStorage();
    renderConversations();
    
    const chatInput = document.getElementById('chatInput');
    const sendButton = document.getElementById('sendButton');
    const newConversationButton = document.getElementById('newConversationButton');
    const serverUrlInput = document.getElementById('serverUrl');
    const fileInput = document.getElementById('fileInput');

    chatInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey && !isGenerating) {
            e.preventDefault();
            sendChatMessage();
        }
    });

    sendButton.addEventListener('click', sendChatMessage);
    newConversationButton.addEventListener('click', startNewConversation);
    fileInput.addEventListener('change', handleFileUpload);
    
    serverUrlInput.addEventListener('change', function() {
        serverUrl = this.value;
        saveToLocalStorage();
        checkConnection();
    });

    if (conversations.length > 0) {
        const lastConversation = conversations[conversations.length - 1];
        loadConversation(lastConversation.id);
    } else {
        startNewConversation();
    }

    checkConnection();
    setInterval(checkConnection, 5000);
});
