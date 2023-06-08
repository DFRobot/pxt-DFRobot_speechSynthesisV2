


//% weight=100 color=#9999FF icon="\uf0a1" block="Speech Synthesis (DFR0760)"
namespace speechSynthesisV2 {

    export enum ENpron {
        //% blockId="speechSynthesisV2_ENpron_ALPHABET" block="letter"
        ALPHABET,
        //% blockId="speechSynthesisV2_ENpron_WORD" block="word"
        WORD
    }

    enum DigitalPron {
        NUMBER,             /**<Telephone number>*/
        NUMERIC,            /**<Number>*/
        AUTOJUDGED,         /**<Auto Judge>*/
    }

    enum SpeechStyle {
        CATON,              /**<Word by word>*/
        SMOOTH,             /**<Fluently>*/
    }

    enum Language {
        CHINESEL,           /**<Chinese>*/
        ENGLISHL,           /**<English>*/
        AUTOJUDGEL,         /**<Auto Judge>*/
    }

    enum ZeroPron {
        ZREO,
        OU
    }

    enum NamePron {
        NAME,
        AUTOJUDGEDN
    }

    enum OnePron {
        YAO,
        CHONE
    }

    enum Pinyin {
        PINYIN_ENABLE,
        PINYIN_DISABLE,
    }

    const I2C_ADDR = 0x40;  //i2c address
    const INQUIRYSTATUS = 0x21;
    const ENTERSAVEELETRI = 0x88;
    const WAKEUP = 0xFF;

    const START_SYNTHESIS = 0x01;
    const START_SYNTHESIS1 = 0x02;
    const STOP_SYNTHESIS = 0x02;
    const PAUSE_SYNTHESIS = 0x03;
    const RECOVER_SYNTHESIS = 0x04;

    class SubMess {
        ischar: number;
        index: number;
        length: number;
        constructor(ischar: number, index: number, length: number) {
            this.ischar = ischar;
            this.index = index;
            this.length = length;
        }
    }

    let wordLenght = 0;
    let listIndex = 0;
    let uniLen = 0;
    let unicodeList: number[] = [];

    let isFlash = false;

    /**
     * 
     */

    //% blockId=speechSynthesisV2_begin block="speech synthesis module I2C mode init" 
    //% weight=40
    export function begin(): void {
        let init = 0xAA;
        for (let i = 0; i < 40; i++) {
            sendCommand1([init], 1);
            basic.pause(50);
            sendCommand1([0xFD, 0x00, 0x01, 0x21], 4);
            if (readACK() == 0x4f)
                break;
        }
        // speakElish("[n1]");
        setVolume(1);
        // setSpeed(5);
        // setTone(5);
        // setEnglishPron(ENpron.WORD);
    }

    /**
     * 
     */

    //% blockId=speechSynthesisV2_speak block="speech synthesis %data"
    //% weight=30
    export function speak(data: string): void {

        let mess: SubMess;
        let uni: number = 0;
        let datalist = control.createBufferFromUTF8(data).toArray(NumberFormat.UInt8LE)
        let len = datalist.length;
        listIndex = 0;

        while (listIndex < len) {
            isFlash = false;
            mess = getSubMess(datalist);
            if (mess.ischar === 2) {
                let sendData: number[] = [0xfd, (mess.length + 2) >> 8, (mess.length + 2) & 0xff, 0x01, 0x03];
                sendCommand1(sendData, 5);
                for (let i = 0; i < mess.index;) {
                    let utf8 = datalist[listIndex + i];
                    if (utf8 >= 0xe0) {
                        uni = utf8 & 15;
                        i++;
                        utf8 = datalist[listIndex + i];
                        uni <<= 6;
                        uni |= (utf8 & 0x03f);
                        i++;
                        utf8 = datalist[listIndex + i];
                        uni <<= 6;
                        uni |= (utf8 & 0x03f);

                        sendData[0] = uni & 0xff;
                        sendData[1] = uni >> 8;
                        sendCommand1(sendData, 2);
                        i++;
                    } else if (utf8 >= 0xc0) {
                        uni = utf8 & 0x1f;
                        i++;
                        utf8 = datalist[listIndex + i];
                        uni <<= 6;
                        uni |= (utf8 & 0x03f);
                        i++;
                        sendData[0] = uni & 0xff;
                        sendData[1] = uni >> 8;
                        sendCommand1(sendData, 2);
                    }
                }
            }

            if (mess.ischar === 1) {
                let sendData = [0xfd, (mess.length + 2) >> 8, (mess.length + 2) & 0xff, 0x01, 0x00];
                sendCommand1(sendData, 5);
                for (let i = 0; i < mess.index;) {
                    let utf8 = datalist[listIndex + i];
                    sendData[0] = utf8 & 0x7f;
                    sendCommand1(sendData, 1);
                    i++;
                }
            }
            if (mess.length == 0) break;
            // wait();
            serial.writeLine("listIndex" + listIndex)
            listIndex += mess.index;
        }
    }

    /**
     * 
     */

    //% blockId=speechSynthesisV2_setPara block="set volume %music speed %speak tone %tone"
    //% music.min=0 music.max=10 music.defl=8
    //% speak.min=0 speak.max=10 speak.defl=5
    //% tone.min=0 tone.max=10 tone.defl=5
    //% weight=20
    export function setPara(music: number, speak: number, tone: number): void {
        setVolume(music);
        setSpeed(speak);
        setTone(tone);
    }

    /**
     * 
     */

    //% blockId=speechSynthesisV2_setPronunciation block="set word pronounciation %pron"
    //% weight=10
    export function setPronunciation(pron: ENpron): void {
        setEnglishPron(pron);
    }

    function setVolume(voc: number): void {
        if (voc > 9) {
            voc = 9;
        }
        speakElish("[v" + String.fromCharCode(48 + voc) + "]"); //"[v5]"
    }

    function setSpeed(speed: number): void {
        if (speed > 9) {
            speed = 9;
        }
        speakElish("[s" + String.fromCharCode(48 + speed) + "]"); //"[s5]"
    }

    function setTone(tone: number): void {
        if (tone > 9) {
            tone = 9;
        }
        speakElish("[t" + String.fromCharCode(48 + tone) + "]"); //"[t5]"
    }

    function setEnglishPron(pron: ENpron): void {
        let str = "";
        if (pron == ENpron.ALPHABET) {
            str = "[h1]";
        } else if (pron == ENpron.WORD) {
            str = "[h2]";
        }
        speakElish(str);
    }

    function setDigitalPron(pron: DigitalPron): void {
        let str = "";
        if (pron == DigitalPron.NUMBER) {
            str = "[n1]";
        } else if (pron == DigitalPron.NUMERIC) {
            str = "[n2]";
        } else if (pron == DigitalPron.AUTOJUDGED) {
            str = "[n0]";
        }
        speakElish(str);
    }

    function setSpeechStyle(style: SpeechStyle): void {
        let str = "";
        if (style == SpeechStyle.CATON) {
            str = "[f0]";
        } else if (style == SpeechStyle.SMOOTH) {
            str = "[f1]";
        }
        speakElish(str);
    }

    function enablePINYIN(enable: boolean): void {
        let str = "";
        if (enable == true) {
            str = "[i1]";
        } else if (enable == false) {
            str = "[i0]";
        }
        speakElish(str);
    }

    function setLanguage(style: Language): void {
        let str = "";
        if (style == Language.CHINESEL) {
            str = "[g1]";
        } else if (style == Language.ENGLISHL) {
            str = "[g2]";
        } else if (style == Language.AUTOJUDGEL) {
            str = "[g0]";
        }
        speakElish(str);
    }

    function setZeroPron(pron: ZeroPron): void {
        let str = "";
        if (pron == ZeroPron.ZREO) {
            str = "[o0]";
        } else if (pron == ZeroPron.OU) {
            str = "[o1]";
        }
        speakElish(str);
    }

    function setOnePron(pron: OnePron): void {
        let str = "";
        if (pron == OnePron.YAO) {
            str = "[y0]";
        } else if (pron == OnePron.CHONE) {
            str = "[y1]";
        }
        speakElish(str);
    }

    function setNamePron(pron: NamePron): void {
        let str = "";
        if (pron == NamePron.NAME) {
            str = "[r1]";
        } else if (pron == NamePron.AUTOJUDGEDN) {
            str = "[r0]";
        }
        speakElish(str);
    }

    function enableRhythm(enable: boolean): void {
        let str = "";
        if (enable == true) {
            str = "[z1]";
        } else if (enable == false) {
            str = "[z0]";
        }
        speakElish(str);
    }
    function reset(pron: ENpron): void {
        speakElish("[d]");
    }

    function sendCommand1(data: number[], length: number): void {
        let cmd = pins.createBufferFromArray(data.slice(0, length));
        pins.i2cWriteBuffer(I2C_ADDR, cmd, false);
    }

    function sendCommand2(head: number[], data: number[], length: number): void {

        let lenTemp = 0;
        let point = 0;
        pins.i2cWriteBuffer(I2C_ADDR, pins.createBufferFromArray(head), false);

        while (length) {
            if (length > 28) {
                lenTemp = 28;
            }
            else {
                lenTemp = length;
            }

            pins.i2cWriteBuffer(I2C_ADDR, pins.createBufferFromArray(data.slice(point, lenTemp)), false);
            length -= lenTemp;
            point += lenTemp;
        }
    }

    function sendPack(cmd: number, data: number[], len: number): void {
        let head = [0xfd, 0, 0, 0, 0];
        let length = 0;
        switch (cmd) {
            case START_SYNTHESIS: {
                length = 2 + len;
                head[1] = length >> 8;
                head[2] = length & 0xff;
                head[3] = START_SYNTHESIS;
                head[4] = 0x03;
                sendCommand2(head, data, len);
            } break;
            case START_SYNTHESIS1: {
                length = 2 + len;
                head[1] = length >> 8;
                head[2] = length & 0xff;
                head[3] = START_SYNTHESIS;
                head[4] = 0x00;
                sendCommand2(head, data, len);
            } break;
            default: {
                length = 1;
                head[1] = length >> 8;
                head[2] = length & 0xff;
                head[3] = cmd;
                sendCommand1(head, 4);
            } break;

        }
    }

    function readACK(): number {
        let data: Buffer = pins.i2cReadBuffer(I2C_ADDR, 1)
        basic.pause(10);
        return data[0];
    }

    function wait(): void {
        while (readACK() != 0x41) { }//等待语音合成完成
        basic.pause(100);
        while (1) {     //等待语音播放完成
            sendCommand1([0xFD, 0x00, 0x01, 0x21], 4);
            if (readACK() == 0x4f) {
                break;
            }
            basic.pause(20);
        }
    }

    function speakElish(word: string): void {

        wordLenght = word.length;
        for (let i = 0; i < wordLenght; i++) {
            unicodeList.push(word.charCodeAt(i) & 0x7f);
        }
        sendPack(START_SYNTHESIS1, unicodeList, wordLenght);

        wait();

        wordLenght = 0;
        unicodeList = [];
    }

    function getSubMess(dat: number[]): SubMess {
        let mess: SubMess = new SubMess(0, 0, 0);
        let frist: boolean = false;
        let ischar: number = 0;
        let index: number = 0;
        let length: number = 0;

        if (isFlash == true) {

        } else {
            wordLenght = dat.length;
        }

        while (index < wordLenght) {
            let utf8 = 0;
            if (isFlash == true) {

            } else {
                utf8 = dat[index + listIndex];
            }
            if (utf8 >= 0xfc) {
                index += 6;
                length += 4;
            } else if (utf8 >= 0xf8) {
                index += 5;
                length += 3;
            } else if (utf8 >= 0xf0) {
                index += 4;
                length += 3;
            } else if (utf8 >= 0xe0) {
                if (ischar == 1) {
                    break;
                }
                index += 3;
                length += 2;
                if (frist == false) {
                    ischar = 2;
                    frist = true;
                }
            } else if (utf8 >= 0xc0) {
                if (ischar == 1) {
                    break;
                }
                index += 2;
                length += 2;
                if (frist == false) {
                    ischar = 2;
                    frist = true;
                }
            } else if (utf8 <= 0x80) {
                if (utf8 == 0) break;
                if (ischar == 2) {
                    break;
                }

                index += 1;
                length++;

                if (frist == false) {
                    ischar = 1;
                    frist = true;
                }
            }
        }
        mess.ischar = ischar;
        mess.length = length;
        mess.index = index;
        return mess;
    }

}

