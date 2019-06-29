import fs from 'fs';
import path from 'path';
import Logger from '@mazemasterjs/logger';
import { logTrace } from './funcs';

export class GameLang {
  public static getInstance(langCode: string) {
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
      logTrace(__filename, method, `No language defined for code '${langCode}' - defaulting to English (en)!`);
      return this.languages.find(item => {
        return item.language === 'en';
      });
    }

    return lang;
  }

  private static instance: GameLang;
  private static languages = new Array();
  private constructor() {}

  private loadLanguages() {
    const langs = ['es', 'en'];

    for (const lang of langs) {
      const file = path.resolve(`data/${lang}.json`);
      const data = JSON.parse(fs.readFileSync(file, 'UTF-8'));
      GameLang.languages.push(data);
    }
  }
}

export default GameLang;
