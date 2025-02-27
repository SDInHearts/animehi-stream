"use client"

import React, { useEffect, useState } from "react"
import type Artplayer from "artplayer/types/artplayer"
import { VideoPlayer } from "./artplayer/art-player"
import type { Source, SourcesResponse } from "types/types"
import { notFound } from "next/navigation"

type WatchProps = {
  sourcesPromise: Promise<SourcesResponse | undefined>
}

const ArtPlayerComponent = ({ sourcesPromise }: WatchProps) => {
  const [url, setUrl] = useState("")
  const [sources, setSources] = useState<Source[] | undefined>(undefined)

  useEffect(() => {
    let isMounted = true

    const fetchSources = async () => {
      try {
        const res = await sourcesPromise
        if (!res || !isMounted) return notFound()

        setSources(res.sources)

        // Select the default quality source
        const defaultSource = res.sources.find((src) => src.quality === "default")
        if (defaultSource) setUrl(defaultSource.url)
      } catch (error) {
        console.error("Failed to fetch sources:", error)
      }
    }

    fetchSources()

    return () => {
      isMounted = false
    }
  }, [sourcesPromise])

  function getSelectedSrc(selectedQuality?: string): string {
    const selectedSrc = sources?.find((src) => src.quality === selectedQuality)
    return selectedSrc ? selectedSrc.url : ""
  }

  const option = {
    url,
    autoplay: true,
    autoSize: false,
    fullscreen: true,
    autoOrientation: true,
    setting: true,
    screenshot: true,
    hotkey: true,
    pip: true,
    airplay: true,
    lock: true,
  }

  function getInstance(art: Artplayer) {
    art.on("video:ended", () => {
      console.log("Video ended")
    })
  }

  return <VideoPlayer option={option} getInstance={getInstance} />
}

export default ArtPlayerComponent
