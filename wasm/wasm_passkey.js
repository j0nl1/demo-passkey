import * as wasm from "./wasm_passkey_bg.wasm";
import { __wbg_set_wasm } from "./wasm_passkey_bg.js";
__wbg_set_wasm(wasm);
export * from "./wasm_passkey_bg.js";

wasm.__wbindgen_start();
