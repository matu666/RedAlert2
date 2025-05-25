import React from "react";
import { CompositeDisposable } from "../../../../util/disposable/CompositeDisposable";

const mimeTypeMap = new Map([
  ["mp4", "video/mp4"],
  ["webm", "video/webm"],
]);

export class MenuVideo extends React.Component {
  constructor() {
    super(...arguments);
    this.el = null;
    this.disposables = new CompositeDisposable();
    this.disposed = false;
  }

  render() {
    const src = this.props.src;
    let url, mimeType;

    if (typeof src === "string") {
      url = src;
      mimeType = mimeTypeMap.get(src.split("?")[0].split(".").pop()) ?? "video/webm";
    } else if (src) {
      url = URL.createObjectURL(src);
      mimeType = src.type;
      this.disposables.add(() => {
        URL.revokeObjectURL(url);
      });
    } else {
      // If src is undefined, still create the video wrapper but with empty src
      url = "";
      mimeType = "video/webm";
    }

    return React.createElement("div", {
      className: "video-wrapper",
      ref: (ref) => (this.el = ref),
      dangerouslySetInnerHTML: {
        __html: `
          <video style="outline: none;" loop playsinline muted autoplay>
              <source src="${url}" type="${mimeType}" />
          </video>
          <div class="logo" style="opacity: 0;" />
        `,
      },
    });
  }

  componentDidMount() {
    const src = this.props.src;
    let video = this.el.querySelector("video");
    let logo = this.el.querySelector("div");

    if (!src) {
      console.log('[MenuVideo] No video source provided');
      return;
    }

    if (src instanceof File && window.MediaSource) {
      let errorHandler = async () => {
        console.log('[MenuVideo] Video source error, trying MediaSource fallback');
        this.applyMediaSourceFallback(video, await src.arrayBuffer());
      };
      video
        .querySelector("source")
        .addEventListener("error", errorHandler, { once: true });
      video.addEventListener("loadeddata", () => {
        video.querySelector("source").removeEventListener("error", errorHandler);
        console.log('[MenuVideo] Video loaded successfully');
      });
    }

    video.addEventListener("loadeddata", () => {
      logo.style.opacity = "";
      console.log('[MenuVideo] Video data loaded, showing logo');
    });

    video.addEventListener("error", (e) => {
      console.error('[MenuVideo] Video error:', e);
    });
  }

  async applyMediaSourceFallback(video, buffer) {
    if (!this.disposed) {
      let mediaSource = new MediaSource();
      mediaSource.addEventListener("sourceopen", () => {
        try {
          let sourceBuffer = mediaSource.addSourceBuffer('video/webm; codecs="vp8"');
          sourceBuffer.mode = "sequence";
          sourceBuffer.appendBuffer(buffer);
          this.timeoutId = setTimeout(
            () => this.processNextSegment(sourceBuffer, video, buffer),
            1000,
          );
          this.disposables.add(() => clearTimeout(this.timeoutId));
        } catch (error) {
          if (error.name !== "NotSupportedError") {
            console.error(error);
          }
          return;
        }
      });

      let objectUrl = (video.src = URL.createObjectURL(mediaSource));
      this.disposables.add(() => {
        URL.revokeObjectURL(objectUrl);
        objectUrl = undefined;
      });
    }
  }

  processNextSegment(sourceBuffer, video, buffer) {
    try {
      // Check if sourceBuffer is still valid and not removed
      if (this.disposed || !sourceBuffer || sourceBuffer.updating) {
        return;
      }
      
      // Check if sourceBuffer is still attached to a MediaSource
      if (!sourceBuffer.buffered) {
        console.warn('[MenuVideo] SourceBuffer has been removed from MediaSource');
        return;
      }
      
      if (sourceBuffer.buffered.length > 0) {
        if (sourceBuffer.buffered.end(sourceBuffer.buffered.length - 1) - video.currentTime < 10) {
          sourceBuffer.appendBuffer(buffer);
        }
        if (video.paused) {
          video.play()?.catch((error) => console.error(error));
        }
      }
    } catch (error) {
      console.error('[MenuVideo] Error in processNextSegment:', error);
      return;
    }
    
    if (!this.disposed) {
      this.timeoutId = setTimeout(
        () => this.processNextSegment(sourceBuffer, video, buffer),
        1000,
      );
    }
  }

  componentWillUnmount() {
    this.disposables.dispose();
    this.disposed = true;
  }
} 