import assert from "node:assert/strict";

import { selectPexelsVideoFile } from "./pull-videos";

const selected = selectPexelsVideoFile([
  {
    id: 1,
    file_type: "video/mp4",
    width: 3840,
    height: 2160,
    link: "https://videos.pexels.com/4k.mp4",
  },
  {
    id: 2,
    file_type: "video/mp4",
    width: 1280,
    height: 720,
    link: "https://videos.pexels.com/hd.mp4",
  },
  {
    id: 3,
    file_type: "video/mp4",
    width: 1920,
    height: 1080,
    link: "https://videos.pexels.com/full-hd.mp4",
  },
]);
assert.equal(selected?.id, 3);
assert.equal(
  selectPexelsVideoFile([
    {
      file_type: "video/mp4",
      width: 2160,
      height: 3840,
      link: "https://videos.pexels.com/portrait.mp4",
    },
  ]),
  null,
);
assert.equal(
  selectPexelsVideoFile([
    {
      file_type: "video/webm",
      width: 1920,
      height: 1080,
      link: "https://videos.pexels.com/video.webm",
    },
  ]),
  null,
);
console.log("Pexels video file selection tests passed.");
