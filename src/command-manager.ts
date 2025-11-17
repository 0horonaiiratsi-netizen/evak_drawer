/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "./app";
import { Command } from "./commands/command";
import { I18nService } from "./i18n";
import { SceneObject } from "./scene/scene-object";
import { LogService } from "./services/logger";

export class CommandManager {
    private app: App;
    private i18n: I18nService;
    public activeCommand: Command | null = null;

    constructor(app: App) {
        this.app = app;
        this.i18n = app.i18n;
    }

    public handleTextInput(input: string): void {
        if (this.activeCommand && this.activeCommand.handleTextInput) {
            this.activeCommand.handleTextInput(input);
        } else {
            this.startCommand(input);
        }
    }

    public async startCommandByName(commandName: string, preSelectedObjects: SceneObject[] = []): Promise<void> {
        if (this.activeCommand) {
            this.activeCommand.cancel();
        }

        const upperCaseCommand = commandName.toUpperCase();
        let command: Command | null = null;

        try {
            switch (upperCaseCommand) {
                case 'LINE':
                case 'L': {
                    const { LineCommand } = await import('./commands/line-command');
                    command = new LineCommand(this.app);
                    break;
                }
                case 'MIRROR':
                case 'MI': {
                    const { MirrorCommand } = await import('./commands/mirror-command');
                    command = new MirrorCommand(this.app);
                    break;
                }
                case 'TRIM':
                case 'TR': {
                    const { TrimCommand } = await import('./commands/trim-command');
                    command = new TrimCommand(this.app);
                    break;
                }
                case 'EXTEND':
                case 'EX': {
                    const { ExtendCommand } = await import('./commands/extend-command');
                    command = new ExtendCommand(this.app);
                    break;
                }
                case 'FILLET':
                case 'F': {
                    const { FilletCommand } = await import('./commands/fillet-command');
                    command = new FilletCommand(this.app);
                    break;
                }
                case 'CHAMFER':
                case 'CHA': {
                    const { ChamferCommand } = await import('./commands/chamfer-command');
                    command = new ChamferCommand(this.app);
                    break;
                }
                case 'OFFSET':
                case 'O': {
                    const { OffsetCommand } = await import('./commands/offset-command');
                    command = new OffsetCommand(this.app);
                    break;
                }
                case 'DIMLINEAR':
                case 'DLI': {
                    const { DimlinearCommand } = await import('./commands/dimlinear-command');
                    command = new DimlinearCommand(this.app);
                    break;
                }
                case 'DIMALIGNED':
                case 'DAL': {
                    const { DimalignedCommand } = await import('./commands/dimaligned-command');
                    command = new DimalignedCommand(this.app);
                    break;
                }
                case 'BLOCK':
                case 'B': {
                    const { BlockCommand } = await import('./commands/block-command');
                    command = new BlockCommand(this.app);
                    break;
                }
                case 'INSERT':
                case 'I': {
                    const { InsertCommand } = await import('./commands/insert-command');
                    command = new InsertCommand(this.app);
                    break;
                }
                case 'EXTRUDE':
                case 'E': {
                    const { ExtrudeCommand } = await import('./commands/extrude-command');
                    command = new ExtrudeCommand(this.app);
                    break;
                }
                case 'REVOLVE':
                case 'REV': {
                    const { RevolveCommand } = await import('./commands/revolve-command');
                    command = new RevolveCommand(this.app);
                    break;
                }
                case 'CUT': {
                    const { CutCommand } = await import('./commands/cut-command');
                    command = new CutCommand(this.app);
                    break;
                }
                case 'SWEEP': {
                    const { SweepCommand } = await import('./commands/sweep-command');
                    command = new SweepCommand(this.app);
                    break;
                }
                case 'LOFT': {
                    const { LoftCommand } = await import('./commands/loft-command');
                    command = new LoftCommand(this.app);
                    break;
                }
                case '3DFILLET':
                case '3DF': {
                    const { ThreeDFilletCommand } = await import('./commands/three-d-fillet-command');
                    command = new ThreeDFilletCommand(this.app);
                    break;
                }
                case '3DCHAMFER':
                case '3DC': {
                    const { ThreeDChamferCommand } = await import('./commands/three-d-chamfer-command');
                    command = new ThreeDChamferCommand(this.app);
                    break;
                }
            }

            if (command) {
                this.activeCommand = command;
                this.activeCommand.start(preSelectedObjects);
            } else {
                if (commandName.trim()) {
                    LogService.warn(`Unknown command: ${commandName}`);
                    this.app.commandLineController.setPrompt(this.i18n.t('command.unknown', commandName));
                }
            }
        } catch (e: any) {
            LogService.error(`Failed to load and start command '${commandName}':`, e);
            if (e instanceof ReferenceError && (e.message.includes("XState is not defined") || e.message.includes("jsts is not defined"))) {
                 this.app.dialogController.alert(
                    this.i18n.t('dialog.error'),
                    "Failed to load a required library. Please check your internet connection and try reloading the page (Ctrl+Shift+R)."
                 );
            }
            this.activeCommand = null;
            this.app.commandFinished();
        }
    }

    public startCommand(input: string): void {
         this.startCommandByName(input);
    }
    
    public cancelCommand(): void {
        if (this.activeCommand) {
            this.activeCommand.cancel();
            this.activeCommand = null;
            this.app.commandFinished();
        }
    }

    public finishCommand(): void {
        if (this.activeCommand) {
            this.activeCommand.finish();
            this.activeCommand = null;
            this.app.commandFinished();
        }
    }
}
