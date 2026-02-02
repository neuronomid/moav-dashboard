import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function runCommand(command: string): Promise<{ stdout: string; stderr: string }> {
    try {
        const { stdout, stderr } = await execAsync(command, { shell: '/bin/bash' });
        return { stdout, stderr };
    } catch (error: any) {
        throw new Error(`Command failed: ${command}\nError: ${error.message}\nStderr: ${error.stderr}`);
    }
}
