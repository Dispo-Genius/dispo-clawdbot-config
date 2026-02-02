import { Command } from 'commander';
import { existsSync, statSync, mkdtempSync, rmSync } from 'fs';
import { basename, extname, join } from 'path';
import { homedir, tmpdir } from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { formatOutput } from '../utils/output';

const execFileAsync = promisify(execFile);

// Local whisper.cpp has no file size limit
const SUPPORTED_EXTENSIONS = ['.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm', '.ogg', '.flac'];

// Model path resolution
function getModelPath(model: string): string {
  const modelName = model.startsWith('ggml-') ? model : `ggml-${model}`;
  const paths = [
    process.env.WHISPER_MODEL_PATH,
    join(homedir(), '.cache/whisper', `${modelName}.bin`),
    `/opt/homebrew/share/whisper-cpp/models/${modelName}.bin`,
  ].filter(Boolean) as string[];

  for (const p of paths) {
    if (existsSync(p)) return p;
  }
  throw new Error(`Model not found: ${modelName}. Download with: curl -L -o ~/.cache/whisper/${modelName}.bin "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${modelName}.bin"`);
}

// Check binary availability
async function checkBinary(name: string, installCmd: string): Promise<void> {
  try {
    await execFileAsync('which', [name]);
  } catch {
    throw new Error(`${name} not installed. Install with: ${installCmd}`);
  }
}

// Convert audio to 16-bit WAV 16kHz mono (whisper.cpp requirement)
async function convertToWav(inputPath: string, outputDir: string): Promise<string> {
  const outputPath = join(outputDir, 'audio.wav');
  await execFileAsync('ffmpeg', [
    '-i', inputPath,
    '-ar', '16000',
    '-ac', '1',
    '-sample_fmt', 's16',
    '-y',
    outputPath,
  ], { timeout: 120000 });
  return outputPath;
}

// Run whisper transcription
async function runWhisper(wavPath: string, modelPath: string, options: {
  language?: string;
  timestamps?: boolean;
  timeout?: number;
}): Promise<{ text: string; segments?: Array<{ start: number; end: number; text: string }> }> {
  const args = [
    '-m', modelPath,
    '-f', wavPath,
    '-l', options.language || 'en',
    '--no-prints',
  ];

  if (options.timestamps) {
    args.push('-oj'); // JSON output with timestamps
  }

  const { stdout } = await execFileAsync('whisper-cli', args, {
    timeout: options.timeout || 1800000, // 30 min default
  });

  if (options.timestamps) {
    try {
      return JSON.parse(stdout);
    } catch {
      // If JSON parsing fails, return raw output
      return { text: stdout.trim() };
    }
  }

  // Parse timestamp format: [00:00:00.000 --> 00:00:10.400] text
  const lines = stdout.trim().split('\n');
  const text = lines.map(line => {
    const match = line.match(/\[\d+:\d+:\d+\.\d+ --> \d+:\d+:\d+\.\d+\]\s*(.*)/);
    return match ? match[1].trim() : line.trim();
  }).filter(Boolean).join(' ');

  return { text };
}

export const transcribe = new Command('transcribe')
  .description('Transcribe audio file to text using local whisper.cpp')
  .argument('<file>', 'Path to audio file (mp3, mp4, mpeg, mpga, m4a, wav, webm, ogg, flac)')
  .option('-l, --language <code>', 'Language code (e.g., en, es, fr)', 'en')
  .option('--timestamps', 'Include timestamps in output')
  .option('-m, --model <model>', 'Whisper model to use', 'large-v3-turbo')
  .option('--timeout <ms>', 'Transcription timeout in milliseconds', '1800000')
  .action(async (file: string, options) => {
    // Validate file exists
    if (!existsSync(file)) {
      console.error(`Error: File not found: ${file}`);
      process.exit(1);
    }

    // Validate file extension
    const ext = extname(file).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      console.error(`Error: Unsupported file format. Supported: ${SUPPORTED_EXTENSIONS.join(', ')}`);
      process.exit(1);
    }

    let tempDir: string | null = null;

    try {
      // Check required binaries
      await checkBinary('whisper-cli', 'brew install whisper-cpp');
      await checkBinary('ffmpeg', 'brew install ffmpeg');

      // Get model path
      const modelPath = getModelPath(options.model);

      // Create temp directory for conversion
      tempDir = mkdtempSync(join(tmpdir(), 'whisper-'));

      // Convert to WAV format required by whisper.cpp
      const wavPath = await convertToWav(file, tempDir);

      // Run transcription
      const result = await runWhisper(wavPath, modelPath, {
        language: options.language,
        timestamps: options.timestamps,
        timeout: parseInt(options.timeout, 10),
      });

      // Output
      if (options.timestamps) {
        console.log(formatOutput(result));
      } else {
        console.log(formatOutput({
          text: result.text,
          file: basename(file),
        }));
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      } else {
        console.error('Unknown error occurred');
      }
      process.exit(1);
    } finally {
      // Cleanup temp directory
      if (tempDir && existsSync(tempDir)) {
        rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });
