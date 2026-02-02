import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);
export async function runCommand(command) {
    try {
        const { stdout, stderr } = await execAsync(command);
        return { stdout, stderr };
    }
    catch (error) {
        throw new Error(`Command failed: ${command}\nError: ${error.message}\nStderr: ${error.stderr}`);
    }
}
