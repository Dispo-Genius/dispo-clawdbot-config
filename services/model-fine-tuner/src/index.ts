#!/usr/bin/env node
import { config } from 'dotenv';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { execSync } from 'child_process';
import { createHash } from 'crypto';

// Load .env from project root BEFORE any other imports
const envPaths = [
  resolve(process.cwd(), '.env'),
  resolve(__dirname, '../../../../.env'),
  resolve(homedir(), '.claude/.env'),
];

for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    config({ path: envPath, override: true, debug: false });
    break;
  }
}

async function main() {
  const { Command } = await import('commander');

  const program = new Command();

  program
    .name('model-fine-tuner')
    .description('Fine-tuning and batch inference CLI for Claude Code')
    .version('1.1.0');

  // ============================================
  // Data Preparation Commands
  // ============================================

  program
    .command('validate <file>')
    .description('Validate JSONL format for a provider')
    .option('-p, --provider <provider>', 'Provider (openai, vertex, bedrock)', 'openai')
    .action(async (file: string, options: { provider: string }) => {
      await validateFile(file, options.provider);
    });

  program
    .command('analyze <file>')
    .description('Analyze dataset statistics')
    .option('--tokens', 'Include token analysis')
    .action(async (file: string, options: { tokens?: boolean }) => {
      await analyzeFile(file, options.tokens);
    });

  program
    .command('split <file>')
    .description('Split dataset into train/val/test')
    .option('--train <percent>', 'Training set percentage', '80')
    .option('--val <percent>', 'Validation set percentage', '10')
    .option('--test <percent>', 'Test set percentage', '10')
    .action(async (file: string, options: { train: string; val: string; test: string }) => {
      console.log(`Splitting ${file}: ${options.train}% train, ${options.val}% val, ${options.test}% test`);
      console.log('(Not yet implemented - coming soon)');
    });

  // ============================================
  // Fine-Tuning Commands (OpenAI)
  // ============================================

  program
    .command('upload <file>')
    .description('Upload training file to OpenAI')
    .option('-p, --provider <provider>', 'Provider (openai)', 'openai')
    .option('--purpose <purpose>', 'File purpose', 'fine-tune')
    .option('-y, --yes', 'Skip confirmation prompt')
    .action(async (file: string, options: { provider: string; purpose: string; yes?: boolean }) => {
      await uploadFile(file, options);
    });

  program
    .command('create <file-id>')
    .description('Create fine-tuning job from uploaded file')
    .option('-p, --provider <provider>', 'Provider (openai)', 'openai')
    .option('-m, --model <model>', 'Base model to fine-tune', 'gpt-4.1-nano-2025-04-14')
    .option('-s, --suffix <suffix>', 'Model suffix for identification (e.g., "entity-resolver-v1")')
    .option('--epochs <n>', 'Number of training epochs (default: auto)')
    .option('--batch-size <n>', 'Training batch size (default: auto)')
    .option('--lr-multiplier <n>', 'Learning rate multiplier (default: auto)')
    .option('--validation-file <id>', 'Validation file ID')
    .option('-y, --yes', 'Skip confirmation prompt')
    .action(async (fileId: string, options: CreateJobOptions) => {
      await createFineTuningJob(fileId, options);
    });

  program
    .command('status <job-id>')
    .description('Check fine-tuning job status')
    .option('-p, --provider <provider>', 'Provider (openai)', 'openai')
    .option('--poll', 'Poll until job completes')
    .option('--interval <seconds>', 'Polling interval in seconds', '30')
    .action(async (jobId: string, options: { provider: string; poll?: boolean; interval: string }) => {
      await checkJobStatus(jobId, options);
    });

  program
    .command('list-jobs')
    .description('List recent fine-tuning jobs')
    .option('-p, --provider <provider>', 'Provider (openai)', 'openai')
    .option('-n, --limit <n>', 'Number of jobs to show', '10')
    .action(async (options: { provider: string; limit: string }) => {
      await listJobs(options);
    });

  // ============================================
  // Batch Inference Commands
  // ============================================

  program
    .command('run <input>')
    .description('Run rate-limited batch inference on input JSONL')
    .option('-p, --provider <provider>', 'Provider (openai, gemini)', 'openai')
    .option('-m, --model <model>', 'Model ID (e.g., gpt-5.2-instant, gemini-3-flash)')
    .option('-o, --output <path>', 'Output JSONL path', 'output.jsonl')
    .option('-t, --temperature <temp>', 'Temperature (0.0-1.0)', '0.0')
    .option('-r, --rate-limit <n>', 'Requests per second (overrides provider default)')
    .option('--auto', 'Auto-detect best model and settings from input')
    .option('--review', 'Run delegated review after completion')
    .option('--dry-run', 'Validate input without making API calls')
    .option('--batch', 'Force Batch API mode (50% cheaper, 24h SLA)')
    .option('--sync', 'Force synchronous mode (overrides auto-batch)')
    .action(async (input: string, options: RunOptions) => {
      await runBatchInference(input, options);
    });

  // ============================================
  // Info Commands
  // ============================================

  program
    .command('models-available')
    .description('List available models with capabilities')
    .option('-p, --provider <provider>', 'Provider (openai, gemini, bedrock)')
    .option('--sync', 'Force sync model info from APIs')
    .action(async (options: { provider?: string; sync?: boolean }) => {
      // Sync or load model info
      let modelInfo: ModelInfo | null = null;
      if (options.sync) {
        console.log('Syncing model info from APIs...');
        modelInfo = await syncModelInfo();
      } else {
        modelInfo = await ensureModelsFresh();
      }

      const lastUpdated = modelInfo?.lastUpdated
        ? new Date(modelInfo.lastUpdated).toLocaleDateString()
        : 'unknown';

      console.log(`\n=== Available Models (synced: ${lastUpdated}) ===\n`);

      if (!options.provider || options.provider === 'openai') {
        console.log('OpenAI:');
        if (modelInfo?.openai?.inference?.length) {
          console.log('  Inference:', modelInfo.openai.inference.slice(0, 5).join(', '));
        }
        if (modelInfo?.openai?.batch?.length) {
          console.log('  Batch API:', modelInfo.openai.batch.slice(0, 5).join(', '));
        }
        if (modelInfo?.openai?.finetune?.length) {
          console.log('  Fine-tunable:', modelInfo.openai.finetune.join(', '));
        }
        if (!modelInfo?.openai?.inference?.length) {
          console.log('  (Set OPENAI_KEY to fetch models)');
        }
        console.log('');
      }

      if (!options.provider || options.provider === 'gemini') {
        console.log('Gemini (Consumer API):');
        if (modelInfo?.gemini?.inference?.length) {
          console.log('  Inference:', modelInfo.gemini.inference.slice(0, 5).join(', '));
        }
        if (modelInfo?.gemini?.batch?.length) {
          console.log('  Batch API:', modelInfo.gemini.batch.slice(0, 5).join(', '));
        }
        console.log('  Fine-tuning: Use Vertex AI (consumer API deprecated)');
        if (!modelInfo?.gemini?.inference?.length) {
          console.log('  (Set GEMINI_AI_KEY to fetch models)');
        }
        console.log('');
      }

      if (!options.provider || options.provider === 'bedrock') {
        console.log('AWS Bedrock (Anthropic):');
        console.log('  Claude 3 Haiku - Distillation from Claude 3.5 Sonnet');
        console.log('  Region: US West (Oregon) only');
        console.log('');
      }

      console.log('Use --sync to force refresh from APIs.');
    });

  program
    .command('pricing')
    .description('Show current pricing for fine-tuning')
    .action(async () => {
      console.log('\n=== Fine-Tuning Pricing (January 2026) ===\n');

      console.log('OpenAI:');
      console.log('  Training:');
      console.log('    GPT-4.1: $25/M tokens');
      console.log('    GPT-4.1-nano: Lower (check pricing page)');
      console.log('    o4-mini RFT: $100/hr wall-clock');
      console.log('  Inference (tuned):');
      console.log('    GPT-4.1: $3/M in, $12/M out');
      console.log('    GPT-4.1-nano: Lower');
      console.log('');

      console.log('Vertex AI:');
      console.log('  Training: ~$20/hr compute');
      console.log('  Inference: Same as base model');
      console.log('  Batch API: 50% discount');
      console.log('  Context caching: 90% discount (25% of standard)');
      console.log('  Note: Batch + cache discounts do NOT stack');
      console.log('');

      console.log('For latest pricing:');
      console.log('  OpenAI: https://openai.com/api/pricing/');
      console.log('  Vertex: https://cloud.google.com/vertex-ai/generative-ai/pricing');
    });

  // ============================================
  // Review Commands
  // ============================================

  program
    .command('review <file>')
    .description('Review dataset quality')
    .option('--delegate', 'Run review in separate Claude session (saves context)')
    .option('--criteria <path>', 'Custom criteria file')
    .option('--sample <n>', 'Sample size for large files', '50')
    .option('--account <n>', 'CCS account to use for delegation', '2')
    .option('--output <path>', 'Save full report to path')
    .action(async (file: string, options: ReviewOptions) => {
      if (options.delegate) {
        await delegatedReview(file, options);
      } else {
        await localReview(file, options);
      }
    });

  program
    .command('help-workflow')
    .description('Show end-to-end fine-tuning workflow')
    .action(async () => {
      console.log('\n=== Fine-Tuning Workflow ===\n');
      console.log('Phase 1: Data Preparation');
      console.log('  1. model-fine-tuner validate <file> --provider openai');
      console.log('  2. model-fine-tuner analyze <file>');
      console.log('  3. model-fine-tuner split <file> --train 80 --val 10 --test 10');
      console.log('');
      console.log('Phase 2: Training');
      console.log('  4. model-fine-tuner upload <file>');
      console.log('     → Returns file-id');
      console.log('  5. model-fine-tuner create <file-id> --suffix my-model-v1');
      console.log('     → Returns job-id');
      console.log('  6. model-fine-tuner status <job-id> --poll');
      console.log('     → Polls until complete, returns fine-tuned model name');
      console.log('');
      console.log('Phase 3: Inference');
      console.log('  7. model-fine-tuner run <input.jsonl> --model ft:gpt-4.1-nano:org:my-model-v1:abc123');
      console.log('');
      console.log('For full workflow: ~/.claude/skills/model-fine-tuner/workflows/end-to-end.md');
    });

  // Configure help-on-error for all subcommands
  program.commands.forEach(cmd => cmd.showHelpAfterError(true));

  await program.parseAsync(process.argv);
}

// ============================================
// Helper Functions
// ============================================

interface OpenAIMessage {
  role: string;
  content: string;
}

interface OpenAIExample {
  messages: OpenAIMessage[];
}

interface VertexPart {
  text?: string;
}

interface VertexContent {
  role: string;
  parts: VertexPart[];
}

interface VertexExample {
  contents: VertexContent[];
  systemInstruction?: { parts: VertexPart[] };
}

// ============================================
// Batch Inference Types
// ============================================

interface RunOptions {
  provider: string;
  model?: string;
  output: string;
  temperature: string;
  rateLimit?: string;
  auto?: boolean;
  review?: boolean;
  dryRun?: boolean;
  batch?: boolean;
  sync?: boolean;
}

interface CreateJobOptions {
  provider: string;
  model: string;
  suffix?: string;
  epochs?: string;
  batchSize?: string;
  lrMultiplier?: string;
  validationFile?: string;
  yes?: boolean;
}

interface BatchInput {
  id: string;
  messages: OpenAIMessage[];
}

interface BatchOutput {
  id: string;
  response: string;
  tokens: number;
  latency_ms: number;
}

interface BatchError {
  id: string;
  error: string;
  attempts: number;
  last_error: string;
}

interface FormatHint {
  expectJson: boolean;
  isClassification: boolean;
  avgOutputLen: number;
  taskType: 'classification' | 'extraction' | 'generation' | 'reasoning';
}

// ============================================
// OpenAI Batch API Types
// ============================================

interface OpenAIBatchRequest {
  custom_id: string;
  method: string;
  url: string;
  body: {
    model: string;
    messages: OpenAIMessage[];
    temperature: number;
  };
}

interface OpenAIBatchResponse {
  custom_id: string;
  response?: {
    status_code: number;
    body: {
      choices: Array<{ message: { content: string } }>;
      usage: { completion_tokens: number };
    };
  };
  error?: {
    message: string;
    code?: string;
  };
}

interface BatchStatus {
  id: string;
  status: 'validating' | 'in_progress' | 'completed' | 'failed' | 'expired' | 'cancelled';
  request_counts: {
    total: number;
    completed: number;
    failed: number;
  };
  output_file_id?: string;
  error_file_id?: string;
  errors?: { message: string }[];
}

// ============================================
// Model Freshness Types
// ============================================

interface ModelCapabilities {
  inference?: string[];
  batch?: string[];
  finetune?: string[];
}

interface ModelInfo {
  lastUpdated: string;
  openai: ModelCapabilities;
  gemini: ModelCapabilities;
}

// ============================================
// Gemini Batch API Types
// ============================================

interface GeminiBatchRequest {
  key: string;
  request: {
    contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
    systemInstruction?: { parts: Array<{ text: string }> };
    generationConfig?: { temperature?: number };
  };
}

interface GeminiBatchJob {
  name: string;
  state: 'JOB_STATE_PENDING' | 'JOB_STATE_RUNNING' | 'JOB_STATE_SUCCEEDED' |
         'JOB_STATE_FAILED' | 'JOB_STATE_CANCELLED' | 'JOB_STATE_EXPIRED';
  dest?: { fileName?: string; inlinedResponses?: GeminiBatchResponse[] };
  stats?: { successCount?: number; failureCount?: number };
  error?: { message: string };
}

interface GeminiBatchResponse {
  key: string;
  response?: {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
    usageMetadata?: { candidatesTokenCount?: number };
  };
  error?: { message: string };
}

// ============================================
// Batch Inference Implementation
// ============================================

const RATE_LIMITS: Record<string, number> = {
  gemini: 60,   // Tier 3: 4000 RPM → 60 req/sec (conservative)
  openai: 100,  // 100 req/sec
};

const DEFAULT_MODELS: Record<string, string> = {
  openai: 'gpt-5.2-instant',
  gemini: 'gemini-3-flash',
};

// ============================================
// Model Freshness System
// ============================================

const MODELS_FILE_PATH = resolve(__dirname, '../data/models.json');
const MODELS_FRESHNESS_DAYS = 7;

async function ensureModelsFresh(): Promise<ModelInfo | null> {
  let needsSync = true;
  let existingData: ModelInfo | null = null;

  if (existsSync(MODELS_FILE_PATH)) {
    try {
      existingData = JSON.parse(readFileSync(MODELS_FILE_PATH, 'utf-8')) as ModelInfo;
      const lastUpdated = new Date(existingData.lastUpdated);
      const daysSince = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
      needsSync = daysSince > MODELS_FRESHNESS_DAYS;
    } catch {
      needsSync = true;
    }
  }

  if (needsSync) {
    console.log('Model info > 7 days old, syncing...');
    try {
      return await syncModelInfo();
    } catch (error) {
      console.warn(`Warning: Could not sync model info: ${error instanceof Error ? error.message : error}`);
      return existingData;
    }
  }

  return existingData;
}

async function syncModelInfo(): Promise<ModelInfo> {
  const [openai, gemini] = await Promise.all([
    fetchOpenAIModels(),
    fetchGeminiModels(),
  ]);

  const models: ModelInfo = {
    lastUpdated: new Date().toISOString(),
    openai,
    gemini,
  };

  mkdirSync(resolve(__dirname, '../data'), { recursive: true });
  writeFileSync(MODELS_FILE_PATH, JSON.stringify(models, null, 2));
  console.log('Model info synced.');

  return models;
}

async function fetchOpenAIModels(): Promise<ModelCapabilities> {
  const apiKey = process.env.OPENAI_KEY;
  if (!apiKey) {
    return { inference: [], batch: [], finetune: [] };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      console.warn(`OpenAI models API returned ${response.status}`);
      return { inference: [], batch: [], finetune: [] };
    }

    const data = await response.json() as { data: Array<{ id: string }> };

    // Filter for relevant models (gpt-4.1*, gpt-5*, o3*, o4*)
    const relevantModels = data.data
      .map(m => m.id)
      .filter(id => /^(gpt-4\.1|gpt-5|o3|o4)/.test(id))
      .sort();

    // Categorize by capability (heuristics based on model names)
    const inference = relevantModels;
    const batch = relevantModels.filter(m => !m.includes('realtime'));
    const finetune = relevantModels.filter(m =>
      m.includes('gpt-4.1-nano') || m.includes('gpt-4.1-mini') || m.includes('gpt-4.1-2025') || m.includes('o4-mini')
    );

    return { inference, batch, finetune };
  } catch (error) {
    console.warn(`Error fetching OpenAI models: ${error instanceof Error ? error.message : error}`);
    return { inference: [], batch: [], finetune: [] };
  }
}

async function fetchGeminiModels(): Promise<ModelCapabilities> {
  const apiKey = process.env.GEMINI_AI_KEY;
  if (!apiKey) {
    return { inference: [], batch: [], finetune: [] };
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );

    if (!response.ok) {
      console.warn(`Gemini models API returned ${response.status}`);
      return { inference: [], batch: [], finetune: [] };
    }

    const data = await response.json() as { models: Array<{ name: string; supportedGenerationMethods?: string[] }> };

    // Filter for relevant models (gemini-2.5*, gemini-3*)
    const relevantModels = data.models
      .map(m => m.name.replace('models/', ''))
      .filter(id => /^gemini-(2\.5|3)/.test(id))
      .sort();

    // Categorize by capability
    const inference = relevantModels;
    const batch = relevantModels.filter(m =>
      m.includes('flash') || m.includes('pro')
    );
    // Vertex AI fine-tuning (consumer API deprecated fine-tuning)
    const finetune = relevantModels.filter(m =>
      m.includes('gemini-2.5-flash') && !m.includes('lite')
    );

    return { inference, batch, finetune };
  } catch (error) {
    console.warn(`Error fetching Gemini models: ${error instanceof Error ? error.message : error}`);
    return { inference: [], batch: [], finetune: [] };
  }
}

function getModelInfo(): ModelInfo | null {
  if (existsSync(MODELS_FILE_PATH)) {
    try {
      return JSON.parse(readFileSync(MODELS_FILE_PATH, 'utf-8')) as ModelInfo;
    } catch {
      return null;
    }
  }
  return null;
}

async function runBatchInference(inputPath: string, options: RunOptions) {
  // Ensure model info is fresh before running
  await ensureModelsFresh();

  const absInput = resolve(inputPath);

  if (!existsSync(absInput)) {
    console.error(`Error: Input file not found: ${absInput}`);
    process.exit(1);
  }

  // Read and parse input
  const content = readFileSync(absInput, 'utf-8');
  const lines = content.trim().split('\n').filter(l => l.trim());

  console.log(`\n=== Batch Inference ===\n`);
  console.log(`Input: ${inputPath} (${lines.length} examples)`);

  // Parse inputs
  const inputs: BatchInput[] = [];
  for (let i = 0; i < lines.length; i++) {
    try {
      const obj = JSON.parse(lines[i]);
      if (!obj.messages || !Array.isArray(obj.messages)) {
        console.error(`Line ${i + 1}: Missing 'messages' array - skipping`);
        continue;
      }
      inputs.push({
        id: obj.id || `${i + 1}`,
        messages: obj.messages,
      });
    } catch (e) {
      console.error(`Line ${i + 1}: Invalid JSON - skipping`);
    }
  }

  if (inputs.length === 0) {
    console.error('Error: No valid inputs found');
    process.exit(1);
  }

  // Auto-detect settings if requested
  let model = options.model;
  let temperature = parseFloat(options.temperature);

  if (options.auto) {
    const hint = detectFormat(inputs.slice(0, 5));
    console.log(`\nAuto-detection:`);
    console.log(`  Task: ${hint.taskType} (avg output: ${hint.avgOutputLen} chars)`);
    console.log(`  Format: ${hint.expectJson ? 'JSON expected' : 'Free text'}`);

    // Select model based on task
    if (options.provider === 'openai') {
      model = hint.taskType === 'reasoning' ? 'gpt-5.2-thinking' : 'gpt-5.2-instant';
    } else {
      model = hint.taskType === 'reasoning' ? 'gemini-3-pro' : 'gemini-3-flash';
    }

    // Set temperature
    temperature = hint.taskType === 'generation' ? 0.5 : 0.0;

    console.log(`  Recommended: ${model}, temperature=${temperature}`);
    console.log('');
  }

  // Use defaults if not specified
  model = model || DEFAULT_MODELS[options.provider];

  console.log(`Provider: ${options.provider}`);
  console.log(`Model: ${model}`);
  console.log(`Temperature: ${temperature}`);
  console.log(`Output: ${options.output}`);

  if (options.dryRun) {
    console.log(`\n✅ Dry run complete - ${inputs.length} valid inputs`);
    return;
  }

  // Check API keys
  const apiKey = options.provider === 'openai'
    ? process.env.OPENAI_KEY
    : process.env.GEMINI_AI_KEY;

  if (!apiKey) {
    const envVar = options.provider === 'openai' ? 'OPENAI_KEY' : 'GEMINI_AI_KEY';
    console.error(`\nError: ${envVar} not set in environment`);
    process.exit(1);
  }

  // Determine batch vs sync mode
  const useBatch = determineBatchMode(inputs.length, options);

  // Batch API supported for OpenAI and Gemini
  if (useBatch && !['openai', 'gemini'].includes(options.provider)) {
    console.error(`\nError: Batch API only supported for OpenAI and Gemini (got: ${options.provider})`);
    console.log('Use --sync to force synchronous mode.');
    process.exit(1);
  }

  let outputs: BatchOutput[] = [];
  let errors: BatchError[] = [];
  const startTime = Date.now();

  if (useBatch) {
    // Run via Batch API (provider-specific)
    try {
      let result: { outputs: BatchOutput[]; errors: BatchError[] };

      if (options.provider === 'openai') {
        result = await runBatchMode(inputs, model!, temperature, apiKey, resolve(options.output));
      } else if (options.provider === 'gemini') {
        result = await runGeminiBatchMode(inputs, model!, temperature, apiKey, resolve(options.output));
      } else {
        throw new Error(`Unsupported batch provider: ${options.provider}`);
      }

      outputs = result.outputs;
      errors = result.errors;
    } catch (error) {
      console.error(`\nBatch API error: ${error instanceof Error ? error.message : error}`);
      console.log('Falling back to synchronous mode...\n');
      // Fall back to sync mode
      const syncResult = await runSyncMode(inputs, options.provider, model!, temperature, apiKey);
      outputs = syncResult.outputs;
      errors = syncResult.errors;
    }
  } else {
    // Run via synchronous rate-limited mode
    const result = await runSyncMode(inputs, options.provider, model!, temperature, apiKey, options.rateLimit);
    outputs = result.outputs;
    errors = result.errors;
  }

  const elapsed = (Date.now() - startTime) / 1000;
  const throughput = inputs.length / elapsed;

  // Write outputs
  const absOutput = resolve(options.output);
  const outputLines = outputs.map(o => JSON.stringify(o)).join('\n');
  writeFileSync(absOutput, outputLines + '\n');
  console.log(`\nOutputs written: ${absOutput}`);

  // Write errors if any
  if (errors.length > 0) {
    const errorPath = absOutput.replace('.jsonl', '.errors.jsonl');
    const errorLines = errors.map(e => JSON.stringify(e)).join('\n');
    writeFileSync(errorPath, errorLines + '\n');
    console.log(`Errors written: ${errorPath}`);
  }

  // Summary
  console.log(`\n=== Summary ===`);
  console.log(`Total: ${inputs.length}`);
  console.log(`Success: ${outputs.length}`);
  console.log(`Errors: ${errors.length}`);
  console.log(`Elapsed: ${elapsed.toFixed(1)}s`);
  console.log(`Throughput: ${throughput.toFixed(1)} req/sec`);

  // Calculate tokens and cost
  const totalTokens = outputs.reduce((sum, o) => sum + o.tokens, 0);
  const avgLatency = outputs.length > 0
    ? outputs.reduce((sum, o) => sum + o.latency_ms, 0) / outputs.length
    : 0;
  console.log(`Total tokens: ${totalTokens.toLocaleString()}`);
  if (!useBatch) {
    console.log(`Avg latency: ${avgLatency.toFixed(0)}ms`);
  }

  // Cost estimate (rough)
  if (totalTokens > 0 && options.provider === 'openai') {
    // Assuming ~$2/M output tokens for gpt-5.2-instant
    const costPerMToken = 2;
    const syncCost = (totalTokens / 1_000_000) * costPerMToken;
    if (useBatch) {
      const batchCost = syncCost * 0.5;
      console.log(`Cost estimate: ~$${batchCost.toFixed(4)} (batch) vs ~$${syncCost.toFixed(4)} (sync)`);
      console.log(`Savings: ~$${(syncCost - batchCost).toFixed(4)} (50%)`);
    } else {
      console.log(`Cost estimate: ~$${syncCost.toFixed(4)}`);
    }
  }

  // Run review if requested
  if (options.review && errors.length === 0) {
    console.log('\nRunning delegated review...\n');
    await delegatedReview(absOutput, { delegate: true, sample: '50', account: '2' });
  }
}

function detectFormat(examples: BatchInput[]): FormatHint {
  let hasJsonHint = false;
  let totalAssistantLen = 0;
  let assistantCount = 0;

  for (const example of examples) {
    // Check system prompt for JSON hints
    const systemMsg = example.messages.find(m => m.role === 'system');
    if (systemMsg?.content) {
      const lower = systemMsg.content.toLowerCase();
      if (lower.includes('json') || lower.includes('format:') || lower.includes('output:')) {
        hasJsonHint = true;
      }
    }

    // Check existing assistant messages if present (for few-shot examples)
    const assistantMsgs = example.messages.filter(m => m.role === 'assistant');
    for (const msg of assistantMsgs) {
      totalAssistantLen += msg.content.length;
      assistantCount++;
    }
  }

  const avgOutputLen = assistantCount > 0 ? totalAssistantLen / assistantCount : 50;

  // Determine task type
  let taskType: FormatHint['taskType'] = 'generation';
  if (avgOutputLen < 50) {
    taskType = 'classification';
  } else if (avgOutputLen < 200 && hasJsonHint) {
    taskType = 'extraction';
  } else if (avgOutputLen > 500) {
    taskType = 'reasoning';
  }

  return {
    expectJson: hasJsonHint,
    isClassification: taskType === 'classification',
    avgOutputLen,
    taskType,
  };
}

async function callModelWithRetry(
  provider: string,
  model: string,
  temperature: number,
  input: BatchInput,
  apiKey: string,
  maxRetries = 3
): Promise<BatchOutput | BatchError> {
  let lastError = '';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const startTime = Date.now();
      const response = await callModel(provider, model, temperature, input, apiKey);
      const latency = Date.now() - startTime;

      return {
        id: input.id,
        response: response.content,
        tokens: response.tokens,
        latency_ms: latency,
      };
    } catch (error: unknown) {
      lastError = error instanceof Error ? error.message : String(error);

      // Don't retry on non-retryable errors
      if (lastError.includes('400') || lastError.includes('invalid')) {
        break;
      }

      // Exponential backoff
      if (attempt < maxRetries) {
        const backoff = Math.pow(2, attempt) * 1000;
        await sleep(backoff);
      }
    }
  }

  return {
    id: input.id,
    error: 'max_retries_exceeded',
    attempts: maxRetries,
    last_error: lastError,
  };
}

async function callModel(
  provider: string,
  model: string,
  temperature: number,
  input: BatchInput,
  apiKey: string
): Promise<{ content: string; tokens: number }> {
  if (provider === 'openai') {
    return callOpenAI(model, temperature, input, apiKey);
  } else if (provider === 'gemini') {
    return callGemini(model, temperature, input, apiKey);
  } else {
    throw new Error(`Unknown provider: ${provider}`);
  }
}

async function callOpenAI(
  model: string,
  temperature: number,
  input: BatchInput,
  apiKey: string
): Promise<{ content: string; tokens: number }> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: input.messages,
      temperature,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${text}`);
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
    usage: { completion_tokens: number };
  };

  return {
    content: data.choices[0]?.message?.content || '',
    tokens: data.usage?.completion_tokens || 0,
  };
}

async function callGemini(
  model: string,
  temperature: number,
  input: BatchInput,
  apiKey: string
): Promise<{ content: string; tokens: number }> {
  // Convert OpenAI format to Gemini format
  const systemMsg = input.messages.find(m => m.role === 'system');
  const otherMsgs = input.messages.filter(m => m.role !== 'system');

  const contents = otherMsgs.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature,
    },
  };

  if (systemMsg) {
    body.systemInstruction = { parts: [{ text: systemMsg.content }] };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${text}`);
  }

  const data = await response.json() as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
    usageMetadata?: { candidatesTokenCount?: number };
  };

  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const tokens = data.usageMetadata?.candidatesTokenCount || Math.ceil(content.length / 4);

  return { content, tokens };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Batch API constants
const BATCH_THRESHOLD = 100; // Auto-select batch for >100 items
const BATCH_POLL_INTERVAL = 30000; // 30 seconds

function determineBatchMode(inputCount: number, options: RunOptions): boolean {
  // Explicit flags override auto-selection
  if (options.sync) {
    console.log('Mode: Synchronous (--sync flag)');
    return false;
  }
  if (options.batch) {
    console.log('Mode: Batch API (--batch flag)');
    return true;
  }

  // Auto-select based on input count
  if (inputCount > BATCH_THRESHOLD) {
    console.log(`Mode: Batch API (auto-selected for ${inputCount} > ${BATCH_THRESHOLD} items)`);
    return true;
  }

  console.log(`Mode: Synchronous (${inputCount} items below batch threshold)`);
  return false;
}

async function runSyncMode(
  inputs: BatchInput[],
  provider: string,
  model: string,
  temperature: number,
  apiKey: string,
  rateLimitOverride?: string
): Promise<{ outputs: BatchOutput[]; errors: BatchError[] }> {
  const rateLimit = rateLimitOverride
    ? parseInt(rateLimitOverride, 10)
    : (RATE_LIMITS[provider] || 60);
  const delayMs = 1000 / rateLimit;

  console.log(`\nRunning at ${rateLimit} req/sec (${rateLimitOverride ? 'custom' : 'default'})...\n`);

  const outputs: BatchOutput[] = [];
  const errors: BatchError[] = [];

  // Fire requests at rate limit (NOT semaphore-based)
  const promises: Promise<{ input: BatchInput; result: BatchOutput | BatchError }>[] = [];

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];

    // Fire request immediately
    const promise = callModelWithRetry(
      provider,
      model,
      temperature,
      input,
      apiKey
    ).then(result => ({ input, result }));

    promises.push(promise);

    // Wait for rate limit slot (NOT for response)
    if (i < inputs.length - 1) {
      await sleep(delayMs);
    }

    // Progress indicator
    if ((i + 1) % 10 === 0 || i === inputs.length - 1) {
      process.stdout.write(`\rFired: ${i + 1}/${inputs.length}`);
    }
  }

  console.log('\n\nWaiting for responses...');

  // Collect all results
  const results = await Promise.all(promises);

  for (const { result } of results) {
    if ('response' in result) {
      outputs.push(result);
    } else {
      errors.push(result);
    }
  }

  return { outputs, errors };
}

// ============================================
// Batch API Implementation
// ============================================

function convertToBatchFormat(
  inputs: BatchInput[],
  model: string,
  temperature: number
): OpenAIBatchRequest[] {
  return inputs.map(input => ({
    custom_id: input.id,
    method: 'POST',
    url: '/v1/chat/completions',
    body: {
      model,
      messages: input.messages,
      temperature,
    },
  }));
}

async function uploadBatchFile(
  batchRequests: OpenAIBatchRequest[],
  apiKey: string
): Promise<string> {
  // Create JSONL content
  const jsonlContent = batchRequests.map(r => JSON.stringify(r)).join('\n');

  // Use native FormData and Blob (Node 18+)
  const form = new FormData();
  const blob = new Blob([jsonlContent], { type: 'application/jsonl' });
  form.append('purpose', 'batch');
  form.append('file', blob, 'batch_input.jsonl');

  const response = await fetch('https://api.openai.com/v1/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: form,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to upload batch file: ${response.status} - ${text}`);
  }

  const data = await response.json() as { id: string };
  return data.id;
}

async function createBatch(
  fileId: string,
  apiKey: string
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/batches', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input_file_id: fileId,
      endpoint: '/v1/chat/completions',
      completion_window: '24h',
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create batch: ${response.status} - ${text}`);
  }

  const data = await response.json() as { id: string };
  return data.id;
}

async function pollBatch(
  batchId: string,
  apiKey: string
): Promise<BatchStatus> {
  let lastStatus = '';

  while (true) {
    const response = await fetch(`https://api.openai.com/v1/batches/${batchId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to poll batch: ${response.status} - ${text}`);
    }

    const status = await response.json() as BatchStatus;
    const { request_counts } = status;
    const progress = request_counts.total > 0
      ? Math.round((request_counts.completed / request_counts.total) * 100)
      : 0;

    // Update progress display
    const statusLine = `Batch: ${request_counts.completed}/${request_counts.total} (${progress}%) - ${status.status}`;
    if (statusLine !== lastStatus) {
      process.stdout.write(`\r${statusLine.padEnd(60)}`);
      lastStatus = statusLine;
    }

    // Check terminal states
    if (['completed', 'failed', 'expired', 'cancelled'].includes(status.status)) {
      console.log(''); // New line after progress
      return status;
    }

    await sleep(BATCH_POLL_INTERVAL);
  }
}

async function downloadBatchResults(
  fileId: string,
  apiKey: string
): Promise<OpenAIBatchResponse[]> {
  const response = await fetch(`https://api.openai.com/v1/files/${fileId}/content`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to download batch results: ${response.status} - ${text}`);
  }

  const content = await response.text();
  const lines = content.trim().split('\n').filter(l => l.trim());

  return lines.map(line => JSON.parse(line) as OpenAIBatchResponse);
}

function parseBatchResults(
  responses: OpenAIBatchResponse[],
  inputMap: Map<string, BatchInput>
): { outputs: BatchOutput[]; failures: BatchInput[] } {
  const outputs: BatchOutput[] = [];
  const failures: BatchInput[] = [];

  for (const resp of responses) {
    const input = inputMap.get(resp.custom_id);
    if (!input) continue;

    if (resp.response && resp.response.status_code === 200) {
      outputs.push({
        id: resp.custom_id,
        response: resp.response.body.choices[0]?.message?.content || '',
        tokens: resp.response.body.usage?.completion_tokens || 0,
        latency_ms: 0, // Batch doesn't track latency
      });
    } else {
      failures.push(input);
    }
  }

  return { outputs, failures };
}

async function cleanupFailures(
  failures: BatchInput[],
  provider: string,
  model: string,
  temperature: number,
  apiKey: string
): Promise<{ outputs: BatchOutput[]; errors: BatchError[] }> {
  console.log(`\nCleaning up ${failures.length} failures via sync API...`);

  const outputs: BatchOutput[] = [];
  const errors: BatchError[] = [];

  for (let i = 0; i < failures.length; i++) {
    const input = failures[i];
    process.stdout.write(`\rSync cleanup: ${i + 1}/${failures.length}`);

    const result = await callModelWithRetry(provider, model, temperature, input, apiKey);

    if ('response' in result) {
      outputs.push(result);
    } else {
      errors.push(result);
    }

    // Rate limit sync cleanup
    await sleep(100);
  }

  console.log(''); // New line after progress
  return { outputs, errors };
}

async function runBatchMode(
  inputs: BatchInput[],
  model: string,
  temperature: number,
  apiKey: string,
  outputPath: string
): Promise<{ outputs: BatchOutput[]; errors: BatchError[] }> {
  console.log('\nUsing OpenAI Batch API (50% cost savings)...\n');

  // Create input map for matching results
  const inputMap = new Map(inputs.map(i => [i.id, i]));

  // Step 1: Convert to batch format
  console.log('Converting to batch format...');
  const batchRequests = convertToBatchFormat(inputs, model, temperature);

  // Step 2: Upload file
  console.log('Uploading batch file...');
  const fileId = await uploadBatchFile(batchRequests, apiKey);
  console.log(`File uploaded: ${fileId}`);

  // Step 3: Create batch
  console.log('Creating batch job...');
  const batchId = await createBatch(fileId, apiKey);
  console.log(`Batch created: ${batchId}`);

  // Step 4: Poll until complete
  console.log('\nPolling for completion...');
  const status = await pollBatch(batchId, apiKey);

  if (status.status === 'failed') {
    const errorMsg = status.errors?.map(e => e.message).join(', ') || 'Unknown error';
    throw new Error(`Batch failed: ${errorMsg}`);
  }

  // Step 5: Download results
  let outputs: BatchOutput[] = [];
  let failures: BatchInput[] = [];

  if (status.output_file_id) {
    console.log('Downloading results...');
    const responses = await downloadBatchResults(status.output_file_id, apiKey);
    const parsed = parseBatchResults(responses, inputMap);
    outputs = parsed.outputs;
    failures = parsed.failures;
  }

  // Also check error file
  if (status.error_file_id) {
    console.log('Downloading error file...');
    const errorResponses = await downloadBatchResults(status.error_file_id, apiKey);
    for (const resp of errorResponses) {
      const input = inputMap.get(resp.custom_id);
      if (input && !failures.includes(input)) {
        failures.push(input);
      }
    }
  }

  console.log(`\nBatch results: ${outputs.length} success, ${failures.length} failures`);

  // Step 6: Cleanup failures via sync
  let errors: BatchError[] = [];
  if (failures.length > 0) {
    const cleanup = await cleanupFailures(failures, 'openai', model, temperature, apiKey);
    outputs = [...outputs, ...cleanup.outputs];
    errors = cleanup.errors;
    console.log(`Cleanup results: ${cleanup.outputs.length} recovered, ${cleanup.errors.length} final errors`);
  }

  return { outputs, errors };
}

// ============================================
// Gemini Batch API Implementation
// ============================================

const GEMINI_BATCH_POLL_INTERVAL = 30000; // 30 seconds

function convertToGeminiBatchFormat(
  inputs: BatchInput[],
  temperature: number
): GeminiBatchRequest[] {
  return inputs.map(input => {
    const systemMsg = input.messages.find(m => m.role === 'system');
    const otherMsgs = input.messages.filter(m => m.role !== 'system');

    const contents = otherMsgs.map(m => ({
      role: (m.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
      parts: [{ text: m.content }],
    }));

    const request: GeminiBatchRequest = {
      key: input.id,
      request: {
        contents,
        generationConfig: { temperature },
      },
    };

    if (systemMsg) {
      request.request.systemInstruction = { parts: [{ text: systemMsg.content }] };
    }

    return request;
  });
}

async function createGeminiBatch(
  batchRequests: GeminiBatchRequest[],
  model: string,
  apiKey: string
): Promise<string> {
  // Create JSONL content for batch input
  const jsonlContent = batchRequests.map(r => JSON.stringify(r)).join('\n');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:batchGenerateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: batchRequests.map(r => r.request),
        // Request responses inline for simplicity (small batches)
        // For large batches, would need to use GCS
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create Gemini batch: ${response.status} - ${text}`);
  }

  const data = await response.json() as { name?: string; responses?: GeminiBatchResponse[] };

  // For sync batchGenerateContent, responses come back immediately
  // For async, we get a batch name to poll
  if (data.name) {
    return data.name;
  }

  // If responses came back immediately, this is sync mode
  // We'll handle this in the calling function
  throw new Error('SYNC_RESPONSE:' + JSON.stringify(data));
}

async function pollGeminiBatch(
  batchName: string,
  apiKey: string
): Promise<GeminiBatchJob> {
  let lastStatus = '';

  while (true) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${batchName}?key=${apiKey}`
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to poll Gemini batch: ${response.status} - ${text}`);
    }

    const status = await response.json() as GeminiBatchJob;
    const { stats } = status;
    const total = (stats?.successCount || 0) + (stats?.failureCount || 0);
    const progress = total > 0 ? Math.round(((stats?.successCount || 0) / total) * 100) : 0;

    const statusLine = `Batch: ${stats?.successCount || 0}/${total} (${progress}%) - ${status.state}`;
    if (statusLine !== lastStatus) {
      process.stdout.write(`\r${statusLine.padEnd(60)}`);
      lastStatus = statusLine;
    }

    // Check terminal states
    if (['JOB_STATE_SUCCEEDED', 'JOB_STATE_FAILED', 'JOB_STATE_CANCELLED', 'JOB_STATE_EXPIRED'].includes(status.state)) {
      console.log('');
      return status;
    }

    await sleep(GEMINI_BATCH_POLL_INTERVAL);
  }
}

async function downloadGeminiBatchResults(
  fileName: string,
  apiKey: string
): Promise<GeminiBatchResponse[]> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/download/v1beta/${fileName}:download?alt=media&key=${apiKey}`
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to download Gemini batch results: ${response.status} - ${text}`);
  }

  const content = await response.text();
  const lines = content.trim().split('\n').filter(l => l.trim());

  return lines.map(line => JSON.parse(line) as GeminiBatchResponse);
}

function parseGeminiBatchResults(
  responses: GeminiBatchResponse[],
  inputMap: Map<string, BatchInput>
): { outputs: BatchOutput[]; failures: BatchInput[] } {
  const outputs: BatchOutput[] = [];
  const failures: BatchInput[] = [];

  for (const resp of responses) {
    const input = inputMap.get(resp.key);
    if (!input) continue;

    if (resp.response && resp.response.candidates?.length > 0) {
      const content = resp.response.candidates[0]?.content?.parts?.[0]?.text || '';
      const tokens = resp.response.usageMetadata?.candidatesTokenCount || Math.ceil(content.length / 4);

      outputs.push({
        id: resp.key,
        response: content,
        tokens,
        latency_ms: 0,
      });
    } else {
      failures.push(input);
    }
  }

  return { outputs, failures };
}

async function runGeminiBatchMode(
  inputs: BatchInput[],
  model: string,
  temperature: number,
  apiKey: string,
  _outputPath: string
): Promise<{ outputs: BatchOutput[]; errors: BatchError[] }> {
  console.log('\nUsing Gemini Batch API (50% cost savings)...\n');

  const inputMap = new Map(inputs.map(i => [i.id, i]));

  console.log('Converting to Gemini batch format...');
  const batchRequests = convertToGeminiBatchFormat(inputs, temperature);

  // Try to create batch - Gemini may return results synchronously for small batches
  console.log('Creating batch job...');
  let batchResponses: GeminiBatchResponse[] = [];

  try {
    const batchName = await createGeminiBatch(batchRequests, model, apiKey);
    console.log(`Batch created: ${batchName}`);

    console.log('\nPolling for completion...');
    const status = await pollGeminiBatch(batchName, apiKey);

    if (status.state === 'JOB_STATE_FAILED') {
      throw new Error(`Batch failed: ${status.error?.message || 'Unknown error'}`);
    }

    // Get results - either inline or from file
    if (status.dest?.inlinedResponses) {
      batchResponses = status.dest.inlinedResponses;
    } else if (status.dest?.fileName) {
      console.log('Downloading results...');
      batchResponses = await downloadGeminiBatchResults(status.dest.fileName, apiKey);
    }
  } catch (error) {
    // Handle synchronous response
    if (error instanceof Error && error.message.startsWith('SYNC_RESPONSE:')) {
      const data = JSON.parse(error.message.replace('SYNC_RESPONSE:', ''));
      if (data.responses) {
        // Map sync responses to our format
        batchResponses = batchRequests.map((req, i) => ({
          key: req.key,
          response: data.responses[i],
        }));
      }
    } else {
      throw error;
    }
  }

  const { outputs, failures } = parseGeminiBatchResults(batchResponses, inputMap);
  console.log(`\nBatch results: ${outputs.length} success, ${failures.length} failures`);

  // Cleanup failures via sync
  let errors: BatchError[] = [];
  if (failures.length > 0) {
    const cleanup = await cleanupFailures(failures, 'gemini', model, temperature, apiKey);
    return {
      outputs: [...outputs, ...cleanup.outputs],
      errors: cleanup.errors,
    };
  }

  return { outputs, errors };
}

// ============================================
// Fine-Tuning Implementation
// ============================================

async function uploadFile(file: string, options: { provider: string; purpose: string; yes?: boolean }) {
  const absPath = resolve(file);

  if (!existsSync(absPath)) {
    console.error(`Error: File not found: ${absPath}`);
    process.exit(1);
  }

  const apiKey = process.env.OPENAI_KEY;
  if (!apiKey) {
    console.error('Error: OPENAI_KEY not set in environment');
    process.exit(1);
  }

  // Analyze file
  const content = readFileSync(absPath, 'utf-8');
  const lines = content.trim().split('\n').filter(l => l.trim());
  const fileSize = (content.length / 1024 / 1024).toFixed(2);

  console.log(`\n=== Upload Training File ===\n`);
  console.log(`File: ${absPath}`);
  console.log(`Examples: ${lines.length}`);
  console.log(`Size: ${fileSize} MB`);
  console.log(`Purpose: ${options.purpose}`);
  console.log(`Provider: ${options.provider}`);

  // Estimate cost
  const estTokens = Math.ceil(content.length / 4);
  const estCost = (estTokens / 1_000_000) * 25 * 3; // $25/M tokens, ~3 epochs
  console.log(`\nEstimated training cost: ~$${estCost.toFixed(2)} (GPT-4.1, 3 epochs)`);

  // Confirmation
  if (!options.yes) {
    console.log(`\n⚠️  This will upload the file to OpenAI for fine-tuning.`);
    console.log(`   Run with -y to skip this confirmation.\n`);

    const readline = await import('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise<string>(resolve => {
      rl.question('Continue? [y/N] ', resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'y') {
      console.log('Cancelled.');
      process.exit(0);
    }
  }

  console.log('\nUploading...');

  // Upload using FormData
  const FormData = (await import('form-data')).default;
  const form = new FormData();
  form.append('purpose', options.purpose);
  form.append('file', readFileSync(absPath), {
    filename: absPath.split('/').pop(),
    contentType: 'application/jsonl',
  });

  const response = await fetch('https://api.openai.com/v1/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      ...form.getHeaders(),
    },
    body: form as unknown as RequestInit['body'],
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`\nError uploading file: ${response.status}`);
    console.error(text);
    process.exit(1);
  }

  const data = await response.json() as {
    id: string;
    filename: string;
    bytes: number;
    created_at: number;
    purpose: string;
    status: string;
  };

  console.log(`\n✅ File uploaded successfully!\n`);
  console.log(`File ID: ${data.id}`);
  console.log(`Filename: ${data.filename}`);
  console.log(`Status: ${data.status}`);
  console.log(`\nNext step:`);
  console.log(`  npx tsx ~/.claude/tools/model-fine-tuner/src/index.ts create ${data.id} --suffix my-model-v1`);
}

async function createFineTuningJob(fileId: string, options: CreateJobOptions) {
  const apiKey = process.env.OPENAI_KEY;
  if (!apiKey) {
    console.error('Error: OPENAI_KEY not set in environment');
    process.exit(1);
  }

  console.log(`\n=== Create Fine-Tuning Job ===\n`);
  console.log(`Training File: ${fileId}`);
  console.log(`Base Model: ${options.model}`);
  if (options.suffix) console.log(`Suffix: ${options.suffix}`);
  if (options.validationFile) console.log(`Validation File: ${options.validationFile}`);

  // Hyperparameters
  const hyperparameters: Record<string, unknown> = {};
  if (options.epochs) {
    hyperparameters.n_epochs = parseInt(options.epochs, 10);
    console.log(`Epochs: ${options.epochs}`);
  }
  if (options.batchSize) {
    hyperparameters.batch_size = parseInt(options.batchSize, 10);
    console.log(`Batch Size: ${options.batchSize}`);
  }
  if (options.lrMultiplier) {
    hyperparameters.learning_rate_multiplier = parseFloat(options.lrMultiplier);
    console.log(`LR Multiplier: ${options.lrMultiplier}`);
  }

  // Confirmation
  if (!options.yes) {
    console.log(`\n⚠️  This will start a fine-tuning job on OpenAI (costs money).`);
    console.log(`   Run with -y to skip this confirmation.\n`);

    const readline = await import('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise<string>(resolve => {
      rl.question('Continue? [y/N] ', resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'y') {
      console.log('Cancelled.');
      process.exit(0);
    }
  }

  console.log('\nCreating job...');

  const body: Record<string, unknown> = {
    training_file: fileId,
    model: options.model,
  };

  if (options.suffix) {
    body.suffix = options.suffix;
  }
  if (options.validationFile) {
    body.validation_file = options.validationFile;
  }
  if (Object.keys(hyperparameters).length > 0) {
    body.hyperparameters = hyperparameters;
  }

  const response = await fetch('https://api.openai.com/v1/fine_tuning/jobs', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`\nError creating job: ${response.status}`);
    console.error(text);
    process.exit(1);
  }

  const data = await response.json() as {
    id: string;
    model: string;
    status: string;
    created_at: number;
    fine_tuned_model: string | null;
  };

  console.log(`\n✅ Fine-tuning job created!\n`);
  console.log(`Job ID: ${data.id}`);
  console.log(`Status: ${data.status}`);
  console.log(`Created: ${new Date(data.created_at * 1000).toISOString()}`);
  console.log(`\nTo check status:`);
  console.log(`  npx tsx ~/.claude/tools/model-fine-tuner/src/index.ts status ${data.id}`);
  console.log(`\nTo poll until complete:`);
  console.log(`  npx tsx ~/.claude/tools/model-fine-tuner/src/index.ts status ${data.id} --poll`);
}

async function checkJobStatus(jobId: string, options: { provider: string; poll?: boolean; interval: string }) {
  const apiKey = process.env.OPENAI_KEY;
  if (!apiKey) {
    console.error('Error: OPENAI_KEY not set in environment');
    process.exit(1);
  }

  const intervalMs = parseInt(options.interval, 10) * 1000;

  const fetchStatus = async () => {
    const response = await fetch(`https://api.openai.com/v1/fine_tuning/jobs/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`Error fetching status: ${response.status}`);
      console.error(text);
      process.exit(1);
    }

    return response.json() as Promise<{
      id: string;
      model: string;
      status: string;
      created_at: number;
      finished_at: number | null;
      fine_tuned_model: string | null;
      trained_tokens: number | null;
      error: { message: string } | null;
    }>;
  };

  if (options.poll) {
    console.log(`\nPolling job ${jobId} every ${options.interval}s...\n`);

    while (true) {
      const data = await fetchStatus();
      const now = new Date().toLocaleTimeString();

      console.log(`[${now}] Status: ${data.status}`);

      if (data.status === 'succeeded') {
        console.log(`\n✅ Fine-tuning complete!\n`);
        console.log(`Fine-tuned model: ${data.fine_tuned_model}`);
        console.log(`Trained tokens: ${data.trained_tokens?.toLocaleString()}`);
        console.log(`\nTo use this model:`);
        console.log(`  model-fine-tuner run input.jsonl --provider openai --model ${data.fine_tuned_model}`);
        break;
      }

      if (data.status === 'failed') {
        console.log(`\n❌ Fine-tuning failed!\n`);
        console.log(`Error: ${data.error?.message || 'Unknown error'}`);
        process.exit(1);
      }

      if (data.status === 'cancelled') {
        console.log(`\n⚠️ Fine-tuning was cancelled.`);
        process.exit(0);
      }

      await sleep(intervalMs);
    }
  } else {
    const data = await fetchStatus();

    console.log(`\n=== Fine-Tuning Job Status ===\n`);
    console.log(`Job ID: ${data.id}`);
    console.log(`Base Model: ${data.model}`);
    console.log(`Status: ${data.status}`);
    console.log(`Created: ${new Date(data.created_at * 1000).toISOString()}`);

    if (data.finished_at) {
      console.log(`Finished: ${new Date(data.finished_at * 1000).toISOString()}`);
    }
    if (data.fine_tuned_model) {
      console.log(`Fine-tuned Model: ${data.fine_tuned_model}`);
    }
    if (data.trained_tokens) {
      console.log(`Trained Tokens: ${data.trained_tokens.toLocaleString()}`);
    }
    if (data.error) {
      console.log(`Error: ${data.error.message}`);
    }

    if (data.status === 'running' || data.status === 'queued' || data.status === 'validating_files') {
      console.log(`\nTo poll until complete:`);
      console.log(`  npx tsx ~/.claude/tools/model-fine-tuner/src/index.ts status ${jobId} --poll`);
    }
  }
}

async function listJobs(options: { provider: string; limit: string }) {
  const apiKey = process.env.OPENAI_KEY;
  if (!apiKey) {
    console.error('Error: OPENAI_KEY not set in environment');
    process.exit(1);
  }

  const response = await fetch(`https://api.openai.com/v1/fine_tuning/jobs?limit=${options.limit}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Error fetching jobs: ${response.status}`);
    console.error(text);
    process.exit(1);
  }

  const data = await response.json() as {
    data: Array<{
      id: string;
      model: string;
      status: string;
      created_at: number;
      fine_tuned_model: string | null;
    }>;
  };

  console.log(`\n=== Recent Fine-Tuning Jobs ===\n`);

  if (data.data.length === 0) {
    console.log('No fine-tuning jobs found.');
    return;
  }

  for (const job of data.data) {
    const created = new Date(job.created_at * 1000).toISOString().split('T')[0];
    const statusIcon = job.status === 'succeeded' ? '✅' :
                       job.status === 'failed' ? '❌' :
                       job.status === 'running' ? '🔄' : '⏳';

    console.log(`${statusIcon} ${job.id}`);
    console.log(`   Base: ${job.model} | Status: ${job.status} | Created: ${created}`);
    if (job.fine_tuned_model) {
      console.log(`   Model: ${job.fine_tuned_model}`);
    }
    console.log('');
  }
}

async function validateFile(file: string, provider: string) {
  console.log(`\nValidating ${file} for ${provider}...\n`);

  if (!existsSync(file)) {
    console.error(`Error: File not found: ${file}`);
    process.exit(1);
  }

  const content = readFileSync(file, 'utf-8');
  const lines = content.trim().split('\n');

  let errors = 0;
  let warnings = 0;

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i].trim();

    if (!line) continue;

    try {
      const obj = JSON.parse(line);

      if (provider === 'openai') {
        const example = obj as OpenAIExample;
        if (!example.messages || !Array.isArray(example.messages)) {
          console.error(`Line ${lineNum}: Missing 'messages' array`);
          errors++;
          continue;
        }

        for (const msg of example.messages) {
          if (!msg.role || !msg.content) {
            console.error(`Line ${lineNum}: Message missing 'role' or 'content'`);
            errors++;
          }
          if (!['system', 'user', 'assistant'].includes(msg.role)) {
            console.error(`Line ${lineNum}: Invalid role '${msg.role}' (must be system/user/assistant)`);
            errors++;
          }
        }

        const lastMsg = example.messages[example.messages.length - 1];
        if (lastMsg.role !== 'assistant') {
          console.warn(`Line ${lineNum}: Warning - conversation should end with assistant message`);
          warnings++;
        }
      }

      if (provider === 'vertex') {
        const example = obj as VertexExample;
        if (!example.contents || !Array.isArray(example.contents)) {
          console.error(`Line ${lineNum}: Missing 'contents' array`);
          errors++;
          continue;
        }

        for (const content of example.contents) {
          if (!content.role || !content.parts) {
            console.error(`Line ${lineNum}: Content missing 'role' or 'parts'`);
            errors++;
          }
          if (!['user', 'model'].includes(content.role)) {
            console.error(`Line ${lineNum}: Invalid role '${content.role}' (must be user/model for Vertex)`);
            errors++;
          }
        }

        const lastContent = example.contents[example.contents.length - 1];
        if (lastContent.role !== 'model') {
          console.warn(`Line ${lineNum}: Warning - conversation should end with model message`);
          warnings++;
        }
      }

    } catch (e) {
      console.error(`Line ${lineNum}: Invalid JSON`);
      errors++;
    }
  }

  console.log(`\n=== Validation Summary ===`);
  console.log(`Total lines: ${lines.length}`);
  console.log(`Errors: ${errors}`);
  console.log(`Warnings: ${warnings}`);

  if (errors === 0) {
    console.log(`\n✅ File is valid for ${provider}`);
  } else {
    console.log(`\n❌ File has ${errors} error(s) - fix before uploading`);
    process.exit(1);
  }
}

async function analyzeFile(file: string, includeTokens?: boolean) {
  console.log(`\nAnalyzing ${file}...\n`);

  if (!existsSync(file)) {
    console.error(`Error: File not found: ${file}`);
    process.exit(1);
  }

  const content = readFileSync(file, 'utf-8');
  const lines = content.trim().split('\n').filter(l => l.trim());

  console.log(`=== Dataset Statistics ===`);
  console.log(`Total examples: ${lines.length}`);

  // Basic analysis - count unique outputs for classification tasks
  const outputs = new Map<string, number>();
  let totalInputChars = 0;
  let totalOutputChars = 0;

  for (const line of lines) {
    try {
      const obj = JSON.parse(line);

      // Try OpenAI format
      if (obj.messages) {
        const assistantMsgs = obj.messages.filter((m: OpenAIMessage) => m.role === 'assistant');
        for (const msg of assistantMsgs) {
          const output = msg.content.trim();
          outputs.set(output, (outputs.get(output) || 0) + 1);
          totalOutputChars += output.length;
        }
        const userMsgs = obj.messages.filter((m: OpenAIMessage) => m.role === 'user');
        for (const msg of userMsgs) {
          totalInputChars += msg.content.length;
        }
      }

      // Try Vertex format
      if (obj.contents) {
        const modelMsgs = obj.contents.filter((c: VertexContent) => c.role === 'model');
        for (const content of modelMsgs) {
          for (const part of content.parts) {
            if (part.text) {
              const output = part.text.trim();
              outputs.set(output, (outputs.get(output) || 0) + 1);
              totalOutputChars += output.length;
            }
          }
        }
        const userMsgs = obj.contents.filter((c: VertexContent) => c.role === 'user');
        for (const content of userMsgs) {
          for (const part of content.parts) {
            if (part.text) {
              totalInputChars += part.text.length;
            }
          }
        }
      }
    } catch (e) {
      // Skip invalid lines
    }
  }

  // Show class distribution if it looks like classification
  if (outputs.size > 0 && outputs.size <= 20) {
    console.log(`\nClass Distribution:`);
    const sorted = Array.from(outputs.entries()).sort((a, b) => b[1] - a[1]);
    const total = lines.length;
    for (const [output, count] of sorted) {
      const pct = ((count / total) * 100).toFixed(1);
      const bar = '█'.repeat(Math.ceil(count / total * 20));
      console.log(`  ${output.substring(0, 30).padEnd(30)}: ${count.toString().padStart(5)} (${pct.padStart(5)}%) ${bar}`);
    }

    // Check for imbalance
    const maxCount = Math.max(...outputs.values());
    const minCount = Math.min(...outputs.values());
    const ratio = maxCount / minCount;
    if (ratio > 3) {
      console.log(`\n⚠️  Class imbalance detected: ${ratio.toFixed(1)}:1 ratio`);
      console.log(`   Consider rebalancing before training.`);
    }
  }

  if (includeTokens) {
    // Rough token estimate (1 token ≈ 4 chars for English)
    const estInputTokens = Math.ceil(totalInputChars / 4);
    const estOutputTokens = Math.ceil(totalOutputChars / 4);
    const avgInputTokens = Math.ceil(estInputTokens / lines.length);
    const avgOutputTokens = Math.ceil(estOutputTokens / lines.length);

    console.log(`\nToken Estimates (rough):`);
    console.log(`  Avg input tokens/example: ~${avgInputTokens}`);
    console.log(`  Avg output tokens/example: ~${avgOutputTokens}`);
    console.log(`  Total input tokens: ~${estInputTokens.toLocaleString()}`);
    console.log(`  Total output tokens: ~${estOutputTokens.toLocaleString()}`);

    // Cost estimate for OpenAI GPT-4.1
    const trainingTokens = (estInputTokens + estOutputTokens) * 3; // 3 epochs
    const trainingCost = (trainingTokens / 1_000_000) * 25;
    console.log(`\nCost Estimate (GPT-4.1, 3 epochs):`);
    console.log(`  Training tokens: ~${trainingTokens.toLocaleString()}`);
    console.log(`  Estimated cost: ~$${trainingCost.toFixed(2)}`);
  }
}

// ============================================
// Review Functions
// ============================================

interface ReviewOptions {
  delegate?: boolean;
  criteria?: string;
  sample: string;
  account: string;
  output?: string;
}

interface CriterionResult {
  pass: boolean;
  metric: string;
  notes: string;
}

interface ReviewReport {
  file: string;
  total_examples: number;
  sampled: number;
  criteria: {
    format: CriterionResult;
    schema: CriterionResult;
    balance: CriterionResult;
    quality: CriterionResult;
    duplicates: CriterionResult;
  };
  overall_pass: boolean;
  recommendations: string[];
}

async function delegatedReview(file: string, options: ReviewOptions) {
  const absPath = resolve(file);

  if (!existsSync(absPath)) {
    console.error(`Error: File not found: ${absPath}`);
    process.exit(1);
  }

  console.log(`\nDelegating review of ${file} to CC${options.account}...\n`);

  const prompt = buildReviewPrompt(absPath, options);

  try {
    // Execute in separate CC session with plan mode (read-only)
    const account = options.account || '2';
    const result = execSync(
      `ccs account${account} --print --output-format json --permission-mode plan "${prompt.replace(/"/g, '\\"')}"`,
      {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
        timeout: 300000, // 5 minute timeout
      }
    );

    // Parse the JSON output from Claude
    const parsed = JSON.parse(result);
    const responseText = parsed.result || parsed.content || result;

    // Extract JSON from the response (may be wrapped in markdown)
    const jsonMatch = responseText.match(/\{[\s\S]*"overall_pass"[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Error: Could not parse review report from response');
      console.log('Raw response:', responseText.substring(0, 500));
      process.exit(1);
    }

    const report: ReviewReport = JSON.parse(jsonMatch[0]);
    displayReport(report);

    // Save report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reviewDir = resolve(homedir(), '.claude/reviews');
    mkdirSync(reviewDir, { recursive: true });

    const reportPath = options.output || resolve(reviewDir, `review-${timestamp}.json`);
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\nReport saved: ${reportPath}`);

  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error running delegated review:', error.message);
    } else {
      console.error('Error running delegated review:', error);
    }
    process.exit(1);
  }
}

async function localReview(file: string, options: ReviewOptions) {
  const absPath = resolve(file);

  if (!existsSync(absPath)) {
    console.error(`Error: File not found: ${absPath}`);
    process.exit(1);
  }

  console.log(`\nReviewing ${file} locally...\n`);

  const content = readFileSync(absPath, 'utf-8');
  const lines = content.trim().split('\n').filter(l => l.trim());

  const sampleSize = parseInt(options.sample, 10);
  const sampled = lines.length > sampleSize
    ? sampleLines(lines, sampleSize)
    : lines;

  const report = runReviewCriteria(absPath, lines.length, sampled);
  displayReport(report);

  // Save report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reviewDir = resolve(homedir(), '.claude/reviews');
  mkdirSync(reviewDir, { recursive: true });

  const reportPath = options.output || resolve(reviewDir, `review-${timestamp}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nReport saved: ${reportPath}`);
}

function sampleLines(lines: string[], n: number): string[] {
  if (lines.length <= n) return lines;

  const shuffled = [...lines];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, n);
}

function runReviewCriteria(file: string, total: number, lines: string[]): ReviewReport {
  const results = {
    format: checkFormat(lines),
    schema: checkSchema(lines),
    balance: checkBalance(lines),
    quality: checkQuality(lines),
    duplicates: checkDuplicates(lines),
  };

  const overall_pass = Object.values(results).every(r => r.pass);

  const recommendations: string[] = [];
  if (!results.balance.pass) {
    recommendations.push('Rebalance classes - oversample minority or undersample majority');
  }
  if (!results.duplicates.pass) {
    recommendations.push('Remove or deduplicate redundant training examples');
  }
  if (!results.quality.pass) {
    recommendations.push('Review and fix empty or truncated responses');
  }
  if (!results.format.pass) {
    recommendations.push('Fix JSON parsing errors before training');
  }
  if (!results.schema.pass) {
    recommendations.push('Ensure all examples follow expected schema');
  }

  return {
    file,
    total_examples: total,
    sampled: lines.length,
    criteria: results,
    overall_pass,
    recommendations,
  };
}

function checkFormat(lines: string[]): CriterionResult {
  let errors = 0;
  for (const line of lines) {
    try {
      JSON.parse(line);
    } catch {
      errors++;
    }
  }

  return {
    pass: errors === 0,
    metric: `${errors} errors`,
    notes: errors === 0 ? 'All lines valid JSON' : `${errors} lines failed to parse`,
  };
}

function checkSchema(lines: string[]): CriterionResult {
  let invalid = 0;
  let format = 'unknown';

  for (const line of lines) {
    try {
      const obj = JSON.parse(line);

      if (obj.messages && Array.isArray(obj.messages)) {
        format = 'OpenAI chat';
        for (const msg of obj.messages) {
          if (!msg.role || !msg.content) {
            invalid++;
            break;
          }
        }
      } else if (obj.contents && Array.isArray(obj.contents)) {
        format = 'Vertex AI';
        for (const content of obj.contents) {
          if (!content.role || !content.parts) {
            invalid++;
            break;
          }
        }
      } else {
        invalid++;
      }
    } catch {
      // Already counted in format check
    }
  }

  const validPct = (((lines.length - invalid) / lines.length) * 100).toFixed(0);

  return {
    pass: invalid === 0,
    metric: `${validPct}% valid`,
    notes: invalid === 0 ? `${format} format` : `${invalid} examples missing required fields`,
  };
}

function checkBalance(lines: string[]): CriterionResult {
  const outputs = new Map<string, number>();

  for (const line of lines) {
    try {
      const obj = JSON.parse(line);

      if (obj.messages) {
        const assistantMsgs = obj.messages.filter((m: { role: string }) => m.role === 'assistant');
        for (const msg of assistantMsgs) {
          const output = msg.content?.trim() || '';
          outputs.set(output, (outputs.get(output) || 0) + 1);
        }
      } else if (obj.contents) {
        const modelMsgs = obj.contents.filter((c: { role: string }) => c.role === 'model');
        for (const content of modelMsgs) {
          for (const part of content.parts || []) {
            if (part.text) {
              const output = part.text.trim();
              outputs.set(output, (outputs.get(output) || 0) + 1);
            }
          }
        }
      }
    } catch {
      // Skip
    }
  }

  // Only check balance for classification (< 20 unique outputs)
  if (outputs.size === 0 || outputs.size > 20) {
    return {
      pass: true,
      metric: `${outputs.size} unique outputs`,
      notes: 'Generative task (balance check skipped)',
    };
  }

  const counts = Array.from(outputs.values());
  const maxCount = Math.max(...counts);
  const minCount = Math.min(...counts);
  const ratio = minCount > 0 ? maxCount / minCount : Infinity;

  const sorted = Array.from(outputs.entries()).sort((a, b) => b[1] - a[1]);
  const topClasses = sorted.slice(0, 3).map(([k, v]) => `${k.substring(0, 15)}=${v}`).join(', ');

  return {
    pass: ratio <= 3,
    metric: `${ratio.toFixed(1)}:1`,
    notes: ratio <= 3 ? `Balanced: ${topClasses}` : `Imbalanced: ${topClasses}`,
  };
}

function checkQuality(lines: string[]): CriterionResult {
  let empty = 0;

  for (const line of lines) {
    try {
      const obj = JSON.parse(line);

      if (obj.messages) {
        const assistantMsgs = obj.messages.filter((m: { role: string }) => m.role === 'assistant');
        for (const msg of assistantMsgs) {
          if (!msg.content || msg.content.trim() === '') {
            empty++;
          }
        }
      } else if (obj.contents) {
        const modelMsgs = obj.contents.filter((c: { role: string }) => c.role === 'model');
        for (const content of modelMsgs) {
          const hasText = (content.parts || []).some((p: { text?: string }) => p.text?.trim());
          if (!hasText) {
            empty++;
          }
        }
      }
    } catch {
      // Skip
    }
  }

  const emptyPct = (empty / lines.length) * 100;

  return {
    pass: emptyPct < 1,
    metric: `${emptyPct.toFixed(1)}% empty`,
    notes: empty === 0 ? 'No empty responses' : `${empty} empty responses`,
  };
}

function checkDuplicates(lines: string[]): CriterionResult {
  const inputHashes = new Map<string, number>();

  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      let input = '';

      if (obj.messages) {
        const userMsgs = obj.messages.filter((m: { role: string }) => m.role === 'user');
        input = userMsgs.map((m: { content: string }) => m.content).join(' ').trim();
      } else if (obj.contents) {
        const userMsgs = obj.contents.filter((c: { role: string }) => c.role === 'user');
        input = userMsgs.flatMap((c: { parts: { text?: string }[] }) =>
          (c.parts || []).map(p => p.text || '')
        ).join(' ').trim();
      }

      if (input) {
        const hash = createHash('md5').update(input.toLowerCase().replace(/\s+/g, ' ')).digest('hex');
        inputHashes.set(hash, (inputHashes.get(hash) || 0) + 1);
      }
    } catch {
      // Skip
    }
  }

  const duplicates = Array.from(inputHashes.values()).filter(v => v > 1).reduce((a, b) => a + b - 1, 0);
  const dupePct = (duplicates / lines.length) * 100;

  return {
    pass: dupePct < 5,
    metric: `${dupePct.toFixed(0)}% dupes`,
    notes: duplicates === 0 ? 'No duplicate inputs' : `${duplicates} duplicate inputs`,
  };
}

function buildReviewPrompt(file: string, options: ReviewOptions): string {
  const sampleSize = options.sample || '50';

  return `# Dataset Review Task

**File:** ${file}
**Sample Size:** ${sampleSize} examples (random sample if file is larger)

## Success Criteria (PASS/FAIL DEFINED)

| Criterion | Check | PASS | FAIL |
|-----------|-------|------|------|
| Format | Parse each line as JSON | 0 parse errors | Any parse error |
| Schema | Check messages/contents array | All have required fields | Missing role/content |
| Balance | Count unique outputs, compute ratio | Ratio ≤ 3:1 | Ratio > 3:1 |
| Quality | Check for empty/truncated responses | Empty < 1% | Empty ≥ 1% |
| Duplicates | Hash inputs, count collisions | Duplicates < 5% | Duplicates ≥ 5% |

## Instructions

1. Read the file at ${file}
2. If file has more than ${sampleSize} lines, randomly sample ${sampleSize} lines
3. For EACH criterion, compute the metric and apply the threshold
4. Return the JSON report below and STOP

## CRITICAL CONSTRAINT

You must NEVER output:
- Raw JSONL lines from the file
- Full file contents
- Debug logs or intermediate results

ONLY output the final JSON report. The entire purpose of this task is to avoid context bloat.

## Output Format (RETURN EXACTLY THIS JSON, THEN STOP)

{
  "file": "${file}",
  "total_examples": N,
  "sampled": N,
  "criteria": {
    "format": { "pass": true/false, "metric": "X errors", "notes": "..." },
    "schema": { "pass": true/false, "metric": "X% valid", "notes": "..." },
    "balance": { "pass": true/false, "metric": "X:1", "notes": "..." },
    "quality": { "pass": true/false, "metric": "X% empty", "notes": "..." },
    "duplicates": { "pass": true/false, "metric": "X% dupes", "notes": "..." }
  },
  "overall_pass": true/false,
  "recommendations": ["...", "..."]
}`;
}

function displayReport(report: ReviewReport) {
  console.log(`\n=== Dataset Review Report ===\n`);
  console.log(`File: ${report.file}`);
  console.log(`Examples: ${report.total_examples} (sampled ${report.sampled})\n`);

  for (const [name, result] of Object.entries(report.criteria)) {
    const icon = result.pass ? '✓' : '✗';
    console.log(`${icon} ${name.padEnd(12)}: ${result.metric.padEnd(15)} ${result.notes}`);
  }

  console.log(`\nOverall: ${report.overall_pass ? 'PASS' : 'FAIL'}`);

  if (report.recommendations.length > 0) {
    console.log(`\nRecommendations:`);
    for (const rec of report.recommendations) {
      console.log(`  - ${rec}`);
    }
  }
}

main().catch(console.error);
