# Nebius x NVIDIA Global AI Hackathon Starter

This workspace is set up to build your hackathon submission using **Nebius Token Factory** and **NVIDIA Open-Source Models** (Nemotron).

## 🚀 Quick Setup

### 1. Activate the Virtual Environment
Open PowerShell in this folder:
`powershell
.\venv\Scripts\Activate
`

### 2. Configure Your API Keys
Open .env in any text editor and fill in:
- NEBIUS_API_KEY: Your key from Nebius Token Factory / Studio.
- TAVILY_API_KEY: (Optional) Your Tavily search key if using web retrieval.

### 3. Verify Connection
Run the test script:
`powershell
python test_connection.py
`

## 🏆 Hackathon Tracks & Models
- **Models:** 
vidia/Llama-3.1-Nemotron-70B-Instruct-HF, 
vidia/nemotron-4-340b-instruct
- **Tracks:**
 1. Coding & Agentic Engineering
 2. Best Apps and Agents
 3. Personal AI
 4. Physical AI
