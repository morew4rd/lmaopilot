// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
let vscode = require('vscode');
// let llama = require('./completions').llama


let endpoint = 'http://localhost:8080'

// async function send_to_api(message, onchunk) {
// 	const request = llama(message, {n_predict: 800})
//      for await (const chunk of request) {
//     //    document.write(chunk.data.content)
// 		onchunk(chunk.data.content)
//      }
// }

async function send_to_api_2(message) {
    let payload = JSON.stringify({ prompt: message, n_predict: 512, }); // adjust based on your server's API specification

    try {
      let response = await fetch(`${endpoint}/completion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: payload
      });

      if (!response.ok) throw new Error('Network response was not ok');

      let data = await response.json();
	  let completions = data.content;
      return completions; // this should be your chatbot's reply
    } catch (error) {
      console.error('There has been a problem with your fetch operation:', error);
	  throw error;
    }
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "lmaopilot" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('lmaopilot.lmao', function () {
		// The code you place here will be executed every time your command is executed

		// Insert text at the current cursor position
		let editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showInformationMessage('LMAO NO FILE');
				return;
		} else {
			let selection = editor.selection;
			let text = editor.document.getText(selection);
			text = text || "hello"

			// send_to_api(text, (x) => {
			// 	console.log(x)
			// 	// vscode.window.showInformationMessage('OUT:' + x);
			// 	let position = editor.selection.active;
			// 	editor.edit(edit => {
			// 		edit.insert(position, "\n----->\n" + x);
			// 	});
			// });

			send_to_api_2(text).then((x) => {
				console.log(x)
				// vscode.window.showInformationMessage('OUT:' + x);
				let position = editor.selection.active;
				editor.edit(edit => {
					edit.insert(position, "\n----->\n" + x);
				});
			})

			// let position = editor.selection.active;
			// editor.edit(edit => {
			// 	edit.insert(position, "\n----->\n" + output);
			// });
			// vscode.window.showInformationMessage('LMAO FILE');
		}
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
