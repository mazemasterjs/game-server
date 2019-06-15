"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = __importDefault(require("@mazemasterjs/logger"));
const log = logger_1.default.getInstance();
class GameLang {
    constructor() { }
    static getInstance(langCode) {
        const method = `getInstance(${langCode})`;
        // instantiate the class instance, if needed
        if (this.instance === undefined) {
            this.instance = new GameLang();
            this.instance.loadLanguages();
        }
        const lang = this.languages.find(item => {
            return item.language === langCode;
        });
        if (lang === undefined) {
            log.warn(__filename, method, `No language defined for code '${langCode}' - defaulting to English (en)!`);
            return this.languages.find(item => {
                return item.language === 'en';
            });
        }
        return lang;
    }
    loadLanguages() {
        const langs = ['es', 'en'];
        for (const lang of langs) {
            const file = path_1.default.resolve(`data/${lang}.json`);
            const data = JSON.parse(fs_1.default.readFileSync(file, 'UTF-8'));
            GameLang.languages.push(data);
        }
    }
}
GameLang.languages = new Array();
exports.GameLang = GameLang;
exports.default = GameLang;
//# sourceMappingURL=GameLang.js.map