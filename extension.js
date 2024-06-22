// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
let vscode = require('vscode');

/////////////////////////////////////////////////
/////////////////////////////////////////////////

// from: https://github.com/ggerganov/llama.cpp/blob/master/examples/server/public/completion.js

const paramDefaults = {
    stream: true,
    n_predict: 500,
    temperature: 0.2,
    stop: ["</s>"]
  };

  let generation_settings = null;


  // Completes the prompt as a generator. Recommended for most use cases.
  //
  // Example:
  //
  //    import { llama } from '/completion.js'
  //
  //    const request = llama("Tell me a joke", {n_predict: 800})
  //    for await (const chunk of request) {
  //      document.write(chunk.data.content)
  //    }
  //
  async function* llama(prompt, params = {}, config = {}) {
    let controller = config.controller;
    const api_url = config.api_url || "http://localhost:8080";
    console.log(api_url)
    if (!controller) {
      controller = new AbortController();
    }

    const completionParams = { ...paramDefaults, ...params, prompt };

    const response = await fetch(`${api_url}/completion`, {
      method: 'POST',
      body: JSON.stringify(completionParams),
      headers: {
        'Connection': 'keep-alive',
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        ...(params.api_key ? {'Authorization': `Bearer ${params.api_key}`} : {})
      },
      signal: controller.signal,
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let content = "";
    let leftover = ""; // Buffer for partially read lines

    try {
      let cont = true;

      while (cont) {
        const result = await reader.read();
        if (result.done) {
          break;
        }

        // Add any leftover data to the current chunk of data
        const text = leftover + decoder.decode(result.value);

        // Check if the last character is a line break
        const endsWithLineBreak = text.endsWith('\n');

        // Split the text into lines
        let lines = text.split('\n');

        // If the text doesn't end with a line break, then the last line is incomplete
        // Store it in leftover to be added to the next chunk of data
        if (!endsWithLineBreak) {
          leftover = lines.pop();
        } else {
          leftover = ""; // Reset leftover if we have a line break at the end
        }

        // Parse all sse events and add them to result
        const regex = /^(\S+):\s(.*)$/gm;
        for (const line of lines) {
          const match = regex.exec(line);
          if (match) {
            result[match[1]] = match[2]
            // since we know this is llama.cpp, let's just decode the json in data
            if (result.data) {
              result.data = JSON.parse(result.data);
              content += result.data.content;

              // yield
              yield result;

              // if we got a stop token from server, we will break here
              if (result.data.stop) {
                if (result.data.generation_settings) {
                  generation_settings = result.data.generation_settings;
                }
                cont = false;
                break;
              }
            }
            if (result.error) {
              try {
                result.error = JSON.parse(result.error);
                if (result.error.message.includes('slot unavailable')) {
                  // Throw an error to be caught by upstream callers
                  throw new Error('slot unavailable');
                } else {
                  console.error(`llama.cpp error [${result.error.code} - ${result.error.type}]: ${result.error.message}`);
                }
              } catch(e) {
                console.error(`llama.cpp error ${result.error}`)
              }
            }
          }
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error("llama error: ", e);
      }
      throw e;
    }
    finally {
      controller.abort();
    }

    return content;
  }

  // Call llama, return an event target that you can subscribe to
  //
  // Example:
  //
  //    import { llamaEventTarget } from '/completion.js'
  //
  //    const conn = llamaEventTarget(prompt)
  //    conn.addEventListener("message", (chunk) => {
  //      document.write(chunk.detail.content)
  //    })
  //
  const llamaEventTarget = (prompt, params = {}, config = {}) => {
    const eventTarget = new EventTarget();
    (async () => {
      let content = "";
      for await (const chunk of llama(prompt, params, config)) {
        if (chunk.data) {
          content += chunk.data.content;
          eventTarget.dispatchEvent(new CustomEvent("message", { detail: chunk.data }));
        }
        if (chunk.data.generation_settings) {
          eventTarget.dispatchEvent(new CustomEvent("generation_settings", { detail: chunk.data.generation_settings }));
        }
        if (chunk.data.timings) {
          eventTarget.dispatchEvent(new CustomEvent("timings", { detail: chunk.data.timings }));
        }
      }
      eventTarget.dispatchEvent(new CustomEvent("done", { detail: { content } }));
    })();
    return eventTarget;
  }

  // Call llama, return a promise that resolves to the completed text. This does not support streaming
  //
  // Example:
  //
  //     llamaPromise(prompt).then((content) => {
  //       document.write(content)
  //     })
  //
  //     or
  //
  //     const content = await llamaPromise(prompt)
  //     document.write(content)
  //
  const llamaPromise = (prompt, params = {}, config = {}) => {
    return new Promise(async (resolve, reject) => {
      let content = "";
      try {
        for await (const chunk of llama(prompt, params, config)) {
          content += chunk.data.content;
        }
        resolve(content);
      } catch (error) {
        reject(error);
      }
    });
  };

  /**
   * (deprecated)
   */
  const llamaComplete = async (params, controller, callback) => {
    for await (const chunk of llama(params.prompt, params, { controller })) {
      callback(chunk);
    }
  }

  // Get the model info from the server. This is useful for getting the context window and so on.
  const llamaModelInfo = async (config = {}) => {
    if (!generation_settings) {
      const api_url = config.api_url || "";
      const props = await fetch(`${api_url}/props`).then(r => r.json());
      generation_settings = props.default_generation_settings;
    }
    return generation_settings;
  }


/////////////////////////////////////////////////
/////////////////////////////////////////////////



async function send_to_api(message, onchunk) {
  let endpoint = 'http://localhost:8080'
	const request = llama(message, {n_predict: 800, api_url:endpoint})
     for await (const chunk of request) {
    //    document.write(chunk.data.content)
		onchunk(chunk.data.content)
     }
}

// async function send_to_api_2(message) {
//     let payload = JSON.stringify({ prompt: message, n_predict: 512, }); // adjust based on your server's API specification

//     try {
//       let response = await fetch(`${endpoint}/completion`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json'
//         },
//         body: payload
//       });

//       if (!response.ok) throw new Error('Network response was not ok');

//       let data = await response.json();
// 	  let completions = data.content;
//       return completions; // this should be your chatbot's reply
//     } catch (error) {
//       console.error('There has been a problem with your fetch operation:', error);
// 	  throw error;
//     }
// }

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
	let disposable = vscode.commands.registerCommand('lmaopilot.lmao_selection', function () {
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

			send_to_api(text, (x) => {
				console.log(x)
				// vscode.window.showInformationMessage('OUT:' + x);
				let position = editor.selection.active;
				editor.edit(edit => {
					edit.insert(position, "" + x);
				});
			});

			// send_to_api_2(text).then((x) => {
			// 	console.log(x)
			// 	// vscode.window.showInformationMessage('OUT:' + x);
			// 	let position = editor.selection.active;
			// 	editor.edit(edit => {
			// 		edit.insert(position, "\n----->\n" + x);
			// 	});
			// })

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
