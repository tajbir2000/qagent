# Ollama Configuration for AutoQAgent

This document describes the Ollama setup for local LLM usage in the AutoQAgent project.

## ✅ Configuration Complete

Your AutoQAgent project is now configured to use Ollama with CodeLlama 7B for local LLM processing.

## 📋 What Was Configured

### 1. **Ollama Installation & Model**

- ✅ Ollama is installed and running
- ✅ CodeLlama 7B model is downloaded and available
- ✅ Ollama service is running on `http://localhost:11434`

### 2. **Project Configuration**

- ✅ Updated `package.json` with Ollama-related scripts
- ✅ Created `.env` file with local LLM configuration
- ✅ Updated `LocalLLMProvider.ts` to use Ollama HTTP API
- ✅ Modified `main.ts` to support local LLM with fallback

### 3. **Environment Variables**

```env
USE_LOCAL_LLM=true
LOCAL_MODEL_PATH=codellama:7b
OLLAMA_BASE_URL=http://localhost:11434
```

## 🚀 Available Commands

### Ollama Management

```bash
# Start Ollama service
npm run ollama:start

# Pull additional models
npm run ollama:pull-codellama    # CodeLlama 7B (already installed)
npm run ollama:pull-llama3       # Llama 3.1 8B
```

### Testing with Local LLM

```bash
# Test with local LLM
npm run test:local-llm

# Or run directly
npx ts-node src/main.ts generate --journey=examples/user-journey.json
```

## 🔧 How It Works

1. **LocalLLMProvider**: Uses Ollama's HTTP API (`/api/generate`) instead of CLI
2. **Fallback Mechanism**: If Ollama fails, automatically falls back to OpenAI
3. **Model Selection**: Currently using CodeLlama 7B, optimized for code generation
4. **JSON Generation**: Enhanced prompts for reliable JSON output

## 📊 Model Performance

- **CodeLlama 7B**: Good for code generation, test case creation, and structured output
- **Memory Usage**: ~4GB RAM
- **Response Time**: 2-10 seconds depending on prompt length
- **Quality**: Suitable for test automation tasks

## 🔄 Switching Models

To use a different model:

1. Pull the model: `ollama pull llama3.1:8b`
2. Update `.env`: `LOCAL_MODEL_PATH=llama3.1:8b`
3. Restart the application

## 🛠️ Troubleshooting

### Ollama Not Starting

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama manually
ollama serve
```

### Model Not Found

```bash
# List available models
ollama list

# Pull missing model
ollama pull codellama:7b
```

### Performance Issues

- Reduce `temperature` in `.env` for more focused responses
- Use smaller models for faster responses
- Ensure sufficient RAM (8GB+ recommended)

## 🎯 Next Steps

1. **Test the setup**: Run `npm run test:local-llm`
2. **Customize prompts**: Modify generators for better test case quality
3. **Add more models**: Pull additional models for different use cases
4. **Optimize performance**: Adjust parameters based on your needs

## 📝 Notes

- The local LLM provides privacy and cost benefits
- Response quality may vary compared to cloud models
- Consider using larger models for complex tasks
- Monitor memory usage when running multiple instances

