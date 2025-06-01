import { CompositeDisposable } from "@/util/disposable/CompositeDisposable";
import { AudioBagFile } from "@/data/AudioBagFile";
import { IdxFile } from "@/data/IdxFile";
import { Engine } from "@/engine/Engine";
import { LazyResourceCollection } from "@/engine/LazyResourceCollection";
import { WavFile } from "@/data/WavFile";

export class SoundTester {
  private static disposables = new CompositeDisposable();
  private static sounds: LazyResourceCollection<WavFile>;
  private static audioBag: AudioBagFile;
  private static listEl: HTMLDivElement;

  static async main(fileSystem: any, containerElement: HTMLElement): Promise<void> {
    this.sounds = Engine.getSounds();
    this.audioBag = new AudioBagFile();

    const audioBagFile = fileSystem.openFile("audio.bag");
    const audioIdxFile = fileSystem.openFile("audio.idx");

    this.audioBag.fromVirtualFile(audioBagFile, new IdxFile(audioIdxFile.stream));
    fileSystem.addArchive(this.audioBag, "audio.bag");

    this.buildBrowser();
  }

  private static selectSound(soundName: string): void {
    const audioContext = new AudioContext();
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.5;

    const soundData = new Uint8Array(this.sounds.get(soundName).getData()).buffer;

    audioContext.decodeAudioData(
      soundData,
      (audioBuffer: AudioBuffer) => {
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(gainNode).connect(audioContext.destination);
        source.start(0);
      },
      (error: DOMException) => console.log(error)
    );
  }

  private static buildBrowser(): void {
    const listElement = this.listEl = document.createElement("div");
    
    // Style the browser
    listElement.style.position = "absolute";
    listElement.style.right = "0";
    listElement.style.top = "0";
    listElement.style.height = "600px";
    listElement.style.width = "200px";
    listElement.style.overflowY = "auto";
    listElement.style.padding = "5px";
    listElement.style.background = "rgba(255, 255, 255, 0.5)";
    listElement.style.border = "1px black solid";

    listElement.appendChild(document.createTextNode("Sound files:"));

    const fileList = this.audioBag.getFileList();
    fileList.forEach((fileName: string) => {
      const link = document.createElement("a");
      link.style.display = "block";
      link.textContent = fileName;
      link.setAttribute("href", "javascript:;");
      
      link.addEventListener("click", () => {
        this.selectSound(fileName);
      });
      
      listElement.appendChild(link);
    });

    document.body.appendChild(listElement);
  }

  static destroy(): void {
    this.listEl.remove();
    this.disposables.dispose();
  }
}