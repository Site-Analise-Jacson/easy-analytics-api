import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import * as path from 'path';

@Injectable()
export class PythonService {
    private readonly logger = new Logger(PythonService.name);

    runScript(
        scriptName: string,
        args: string[] = [],
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            const scriptPath = path.join(
                process.cwd(),
                'test',
                'scripts',
                scriptName,
            );

            const python = spawn('python3', [scriptPath, ...args]);

            let output = '';
            let error = '';

            python.stdout.on('data', (data) => {
                output += data.toString();
            });

            python.stderr.on('data', (data) => {
                error += data.toString();
            });

            python.on('close', (code) => {
                if (code !== 0) {
                    this.logger.error(error);
                    return reject(new Error(error));
                }

                resolve(output.trim());
            });
        });
    }
}
