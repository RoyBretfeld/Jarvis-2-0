import streamlit as st
import os
import sys
import time
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# Add project root to path to find src.core
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from src.core.agent import ForgeAgent

# Page Config
st.set_page_config(
    page_title="TAIA: Tactical Ops",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="expanded"
)

# --- CSS: Amber on Black (Nebuchadnezzar Style) ---
st.markdown("""
    <style>
    /* Global Background */
    .stApp {
        background-color: #0c0c0c;
        color: #FFB000;
        font-family: 'Courier New', monospace;
    }
    
    /* Text Inputs */
    .stTextInput > div > div > input {
        background-color: #1a1a1a;
        color: #FFB000;
        border: 1px solid #FFB000;
        font-family: 'Courier New', monospace;
    }
    
    /* Sidebar */
    section[data-testid="stSidebar"] {
        background-color: #050505;
        border-right: 1px solid #333;
    }
    
    /* Headers */
    h1, h2, h3 {
        color: #FFB000 !important;
        font-family: 'Courier New', monospace;
        letter-spacing: 2px;
        text-transform: uppercase;
    }
    
    /* New CSS for compact sidebar and general theme adjustments */
    .stApp {
        background-color: #0e1117; /* Darker background */
        color: #c9d1d9; /* Lighter text for contrast */
    }
    /* Compact Sidebar */
    [data-testid="stSidebar"] .block-container {
        padding-top: 0rem !important;
        margin-top: -2rem !important;
        padding-bottom: 0rem !important;
        padding-left: 1rem !important;
        padding-right: 1rem !important;
    }
    [data-testid="stSidebar"] h1 { /* Title */
        font-size: 1.2rem !important;
        margin-bottom: 0 !important;
    }
    [data-testid="stSidebar"] h3 { /* Subheaders */
        margin-bottom: 0.2rem !important;
        padding-top: 0.5rem !important;
        font-size: 0.9rem !important;
        text-transform: uppercase;
        font-weight: 600;
        letter-spacing: 0.05em;
    }
    [data-testid="stSidebar"] .stAlert { /* Info/Status boxes */
        padding: 0.2rem 0.5rem !important;
        margin-bottom: 0.2rem !important;
    }
    [data-testid="stSidebar"] hr { /* Dividers */
        margin: 0.5rem 0 !important;
    }
    [data-testid="stSidebar"] .stButton button {
        width: 100%;
        padding: 0.2rem 0.5rem !important;
        min-height: 0px !important;
        height: auto !important;
    }
    /* Hide Streamlit footer/header */
    header {visibility: hidden;}
    footer {visibility: hidden;}
    
    /* Forge Atmosphere (CSS Gradient Fallback) */
    .stApp {
        background: linear-gradient(to bottom, #050505 0%, #1a0b00 100%);
    }
    [data-testid="stSidebar"] {
        background: linear-gradient(to bottom, #050505 0%, #1a0b00 100%) !important;
        border-right: 1px solid #4d3300 !important; /* Brighter gold border */
    }
    
    /* Main Chat Area */
    .stChatMessage {
        background-color: rgba(22, 27, 34, 0.8); /* Semi-transparent */
        border: 1px solid #30363d;
        backdrop-filter: blur(5px);
        border-radius: 5px;
    }
    
    /* Code Blocks */
    code {
        color: #00FF00;
        background-color: #000;
    }
    </style>
""", unsafe_allow_html=True)

# --- Sidebar ---
with st.sidebar:
    # Logo
    try:
        logo_path = os.path.join(os.path.dirname(__file__), "logo.png")
        if os.path.exists(logo_path):
            # Load as bytes to avoid path serving issues
            with open(logo_path, "rb") as f:
                logo_data = f.read()
            st.image(logo_data, use_column_width=True)
        else:
            st.title("⚒️ THE FORGE")
    except Exception as e:
        # Fallback silently if still broken, or show simple error
        st.error(f"Logo Error: {e}")
        st.title("⚒️ THE FORGE")
    
    st.markdown("---")
    
    # Brain Status (Dynamic)
    st.subheader("🧠 BRAIN CONTROL HUB")

import importlib

# --- Agent Initialization (No cache to ensure fresh LLM config) ---
def load_agent():
    base_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

    # Force reload src.core.agent module to pick up changes
    try:
        import src.core.llm
        importlib.reload(src.core.llm)  # Reload Brain Logic first
        
        import src.core.agent
        importlib.reload(src.core.agent) # Then reload Agent
        
        return src.core.agent.ForgeAgent(base_path, model="llama3")
    except ImportError:
        # Fallback if module path issues
        from src.core.agent import ForgeAgent
        return ForgeAgent(base_path, model="llama3")

agent = load_agent()

# --- Sidebar: System Vitals ---
with st.sidebar:
    st.title("🖥️ SYSTEM VITALS")
    
    # Brain Status (LLM Info)
    st.subheader("🧠 Brain Control Hub")
    
    # 1. Provider Selection
    provider_options = ["ollama", "groq"]
    selected_provider = st.selectbox("Provider", provider_options, index=provider_options.index(agent.llm.active_provider))
    
    if selected_provider != agent.llm.active_provider:
        agent.llm.switch_provider(selected_provider)
        st.rerun()

    # 2. Model Selection (Dynamic)
    if selected_provider == "ollama":
        try:
            local_models = agent.llm.list_local_models()
            # Try to report 'qwen' as default index if available
            default_index = 0
            for i, m in enumerate(local_models):
                if m == agent.llm.active_model:
                    default_index = i
            
            selected_model = st.selectbox("Model", local_models, index=default_index)
            if selected_model != agent.llm.active_model:
                agent.llm.set_model(selected_model)
                st.toast(f"Switched to {selected_model}")
        except Exception as e:
            st.error(f"Ollama Error: {e}")
            
    elif selected_provider == "groq":
        has_key = agent.llm.groq_api_key is not None and len(agent.llm.groq_api_key) > 5
        
        if not has_key:
            # Only show input if NO key is set
            st.warning("⚠️ Setup Required")
            api_key = st.text_input("Groq API Key", type="password")
            
            col1, col2 = st.columns([1, 1])
            with col1:
                if st.button("Set Temp"):
                    if api_key:
                        agent.llm.set_groq_key(api_key)
                        st.toast("Key Set (Temporary)")
                        st.rerun()
            with col2:
                if st.button("💾 Save .env"):
                    if api_key:
                        try:
                            agent.llm.save_groq_key_to_env(api_key)
                            st.success("Saved to .env")
                            st.rerun()
                        except AttributeError:
                            st.warning("Healing Brain... (Cache Reset)")
                            st.cache_resource.clear()
                            st.rerun()
           
        groq_models = ["llama-3.3-70b-versatile", "llama3-70b-8192", "mixtral-8x7b-32768"]
        selected_model = st.selectbox("Groq Model", groq_models, index=0) # Simple fallback
        if selected_model != agent.llm.active_model:
             agent.llm.set_model(selected_model)
    
    st.markdown("---")
    
    # Check if agent is outdated (missing llm) - REMOVE or UPDATE (Legacy check commented out for cleaner UI)
    # try:
    #     st.info(f"Provider: {agent.llm.active_provider.upper()}\nModel: {agent.llm.active_model}")
    # except AttributeError: ...

    if st.button("🔄 Reset Brain Cache", help="Clears st.cache_resource to reload updated code"):
        st.cache_resource.clear()
        st.rerun()

    st.markdown("---")
    
    # K8s Status (Mock visual for now, assumes body/state/K8S_STATUS.md exists)
    st.subheader("K8s Cluster Status")
    k8s_path = os.path.join(agent.base_path, "body", "state", "K8S_STATUS.md")
    if os.path.exists(k8s_path):
        with open(k8s_path, "r", encoding="utf-8") as f:
            status_content = f.read()
            if "CRITICAL" in status_content:
                st.error("⚠️ CRITICAL ALERT")
            else:
                st.success("✅ OPERATIONAL")
            with st.expander("Raw Status Data"):
                st.code(status_content, language="markdown")
    else:
        st.warning("⚠️ PROPRIOCEPTION OFFLINE")

    st.markdown("---")
    st.subheader("🧠 Cortex Status")
    if agent.cortex.active:
        st.success("Hippocampus: ACTIVE")
    else:
        st.error("Hippocampus: OFFLINE")

    st.markdown("---")
    st.subheader("🌐 Knowledge Ingest")
    url_input = st.text_input("URL zum Absorbieren:", placeholder="https://...")
    if st.button("Absorbieren"):
        if url_input:
            # Self-Healing: Check if collector exists, if not, patch it
            if not hasattr(agent, "collector"):
                st.toast("Self-Healing: Patching Knowledge Collector...", icon="🛠️")
                try:
                    from src.senses.collector import ForgeCollector
                    agent.collector = ForgeCollector(agent.base_path)
                except ImportError as e:
                    st.error(f"Patch Failed: {e}")
                    st.stop()
            
            with st.spinner("Extrahiere Wissen..."):
                result = agent.collector.absorb_url(url_input, agent.cortex)
                st.success(result)
        else:
            st.warning("Bitte URL eingeben.")

# --- Mainframe: Chat Interface ---
st.title(">> TACTICAL OPS // TAIA CORE")
st.caption("Secure Line... Encryption Active.")

# Initialize Chat History
if "messages" not in st.session_state:
    st.session_state.messages = []

# Image Input (Eyes) - Collapsed to save space
with st.sidebar:
    st.markdown("---")
    with st.expander("👁️ VISUAL INPUT", expanded=False):
        uploaded_file = st.file_uploader("Upload Image", type=["png", "jpg", "jpeg"], label_visibility="collapsed")
    
    image_analysis = None
    if uploaded_file is not None:
        # Import Vision Sense here to load only if needed
        from src.senses.vision import VisionSense
        vision = VisionSense()
        
        st.image(uploaded_file, caption='Visual Data', use_container_width=True)
        with st.spinner("Analyzing Visual Data..."):
             # Convert to bytes
             bytes_data = uploaded_file.getvalue()
             image_analysis = vision.analyze(bytes_data)
             st.info(f"Analysis: {image_analysis}")

# Display History
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# User Input
if prompt := st.chat_input("Command or Inquiry..."):
    # Display User Message
    with st.chat_message("user"):
        st.markdown(prompt)
    st.session_state.messages.append({"role": "user", "content": prompt})

    # Agent Response
    with st.chat_message("assistant"):
        with st.spinner("Processing..."):
            # Pass image analysis AND history
            # We exclude the last message we just appended to avoid duplication if the agent handles it,
            # but usually we pass the history UP TO the current prompt. 
            # `agent.chat` adds prompt to history internally for generation.
            history_context = st.session_state.messages[:-1] 
            
            response = agent.chat(prompt, history=history_context, image_description=image_analysis)
            st.markdown(response)
            
            # Check for Memory Update
            if "MEM_UPDATE:" in response:
                st.toast("💾 Memory Updated", icon="🧠")
                
    st.session_state.messages.append({"role": "assistant", "content": response})
