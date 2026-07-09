import * as vscode from 'vscode';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';

let backendProcess: ChildProcess | null = null;

export function activate(context: vscode.ExtensionContext) {
  console.log('Refactor.ai Extension is now active!');

  // Start the Python sidecar backend
  startPythonSidecar(context);

  // Register the Webview Provider for the Sidebar
  const provider = new RefactorAiViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(RefactorAiViewProvider.viewType, provider)
  );

  // Register the start command
  const startCommand = vscode.commands.registerCommand('refactor-ai.start', () => {
    vscode.commands.executeCommand('workbench.view.extension.refactor-ai-sidebar');
  });

  context.subscriptions.push(startCommand);
}

function startPythonSidecar(context: vscode.ExtensionContext) {
  const backendDir = path.join(context.extensionPath, '../backend');
  const pythonExecutable = path.join(backendDir, '.venv', 'Scripts', 'python.exe');

  console.log(`Starting backend at ${backendDir}`);
  
  backendProcess = spawn(pythonExecutable, ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000'], {
    cwd: backendDir,
  });

  backendProcess.stdout?.on('data', (data) => console.log(`[Backend]: ${data}`));
  backendProcess.stderr?.on('data', (data) => console.error(`[Backend Error]: ${data}`));

  backendProcess.on('exit', (code) => {
    console.log(`Backend process exited with code ${code}`);
  });
}

export function deactivate() {
  if (backendProcess) {
    backendProcess.kill();
  }
}

class RefactorAiViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'refactor-ai.dashboardView';

  constructor(
    private readonly _extensionUri: vscode.Uri,
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        this._extensionUri
      ]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.command) {
        case 'patch':
          await this._applyPatch(data.filePath, data.diff);
          break;
        case 'openFile':
          await this._openFile(data.filePath);
          break;
      }
    });
  }

  private async _applyPatch(filePath: string, diff: string) {
    // We will implement native VS Code workspace edits here
    vscode.window.showInformationMessage(`Applying patch to ${filePath}...`);
    // Placeholder for native patching
  }

  private async _openFile(filePath: string) {
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
    vscode.window.showTextDocument(doc);
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    // Point to the built React app (frontend/dist/index.html equivalent)
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'webview-dist', 'assets', 'index.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'webview-dist', 'assets', 'index.css'));

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${styleUri}" rel="stylesheet">
        <title>Refactor.ai</title>
      </head>
      <body>
        <div id="root"></div>
        <script type="module" crossorigin src="${scriptUri}"></script>
        <script>
          // Provide VS Code API to React
          window.vscode = acquireVsCodeApi();
        </script>
      </body>
      </html>`;
  }
}
