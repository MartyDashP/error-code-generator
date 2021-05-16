import * as vscode from 'vscode';
import { LocalStorageService } from './local-storage-service';

const INIT_VALUE_CODE = 'initValue';
const CURRENT_VALUE_CODE = 'currentValue';
const CAP_VALUE_CODE = 'capValue';
const TEMPLATE_CODE = 'template';
const REPLACEABLE_TEXT = '{{errorCode}}';
const LAST_ERROR_CODE = 'lastErrorCode';

export function activate(context: vscode.ExtensionContext) {
	const storageManager = new LocalStorageService(context.workspaceState);

	let cmd = vscode.commands.registerTextEditorCommand('error-code-generator.insert', (textEditor, edit) => {
		const configuration = vscode.workspace.getConfiguration('error-code-generator');
		const initValueProperty = configuration.get<number>(INIT_VALUE_CODE) ?? 1;
		const templateProperty = configuration.get<string>(TEMPLATE_CODE) ?? '';
		const capValueProperty = configuration.get<number>(CAP_VALUE_CODE) ?? 0;
		const initValue = storageManager.getValue<number>(INIT_VALUE_CODE);

		if (initValue !== initValueProperty) {
			vscode.window.showWarningMessage(`The error counter was reset because the initial value was changed in the settings. Old value: '${initValue}'. New value: '${initValueProperty}'.`)
			storageManager.setValue(INIT_VALUE_CODE, initValueProperty);
			storageManager.setValue(CURRENT_VALUE_CODE, initValueProperty - 1);
		}

		for (const selection of textEditor.selections) {
			let currentValue = storageManager.getValue<number>(CURRENT_VALUE_CODE) as number;

			if (capValueProperty > 0 && currentValue === capValueProperty) {
				vscode.window.showErrorMessage(`Error counter has reached its limit: '${capValueProperty}'. Update initial value or cap value in extension properties.`)
				break;
			}

			currentValue = currentValue + 1;
			const errorCode = templateProperty.replaceAll(REPLACEABLE_TEXT, currentValue.toString());
			storageManager.setValue<number>(CURRENT_VALUE_CODE, currentValue);
			storageManager.setValue<string>(LAST_ERROR_CODE, errorCode);

			if (selection.isEmpty) {
				edit.insert(selection.active, errorCode);
			} else {
				edit.replace(selection, errorCode);
			}
		}
	});

	context.subscriptions.push(cmd);

	cmd = vscode.commands.registerCommand('error-code-generator.showLastErrorCode', () => {
		const lastErrorCode = storageManager.getValue(LAST_ERROR_CODE);

		if (lastErrorCode !== null) {
			vscode.window.showInformationMessage(`Last used error code: ${lastErrorCode}`);
		} else {
			vscode.window.showInformationMessage('Last used error code is undefined');
		}
	});
}

export function deactivate() {}
