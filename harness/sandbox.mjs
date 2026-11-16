// macOS seatbelt profile for agent-controlled shells: no writes under /Users, no reads of the home folder
// except the lab's node_modules, the Node runtime and Playwright's browser cache, and no network beyond localhost.
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { ROOT } from './config.mjs';

export const BROWSERS = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(os.homedir(), 'Library/Caches/ms-playwright');
const q = (p) => JSON.stringify(p);

export function profile() {
  const nodeDir = path.dirname(path.dirname(fs.realpathSync(process.execPath)));
  return `(version 1)
(allow default)
(deny file-write* (subpath "/Users") (subpath "/Volumes") (subpath "/Applications") (subpath "/opt") (subpath "/usr/local") (subpath "/Library") (subpath "/etc") (subpath "/private/etc"))
(deny file-read* (subpath ${q(os.homedir())}))
(allow file-read* (subpath ${q(path.join(ROOT, 'node_modules'))}) (subpath ${q(nodeDir)}) (subpath ${q(BROWSERS)}))
(allow file-read-metadata (subpath "/Users"))
(deny network-outbound (remote ip "*:*"))
(allow network-outbound (remote ip "localhost:*"))
`;
}
export const available = () => process.platform === 'darwin' && fs.existsSync('/usr/bin/sandbox-exec');
