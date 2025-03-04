"use client"

import React, { useEffect, useState, useMemo } from "react"
import { IAnilistInfo } from "types/types"
import Episodes from "@/components/episode/episodes"
import { useSearchParams } from "next/navigation"
import Server from "@/components/server"
import ButtonAction from "@/components/button-action"
import { useWatchStore } from "@/store"
import RelationWatch from "@/components/watch/relation"
import Comments from "@/components/comments/comments"
import type { IEpisode } from "types/types"
import { Badge } from "@/components/ui/badge"
import { LuMessageSquare } from "react-icons/lu"
// import { Spinner } from "@vidstack/react"
// import dynamic from "next/dynamic"
import VidstackPlayer from "./player"
import { fetchAnimeEpisodes } from "@/lib/cache"
import ClientOnly from "@/components/ui/client-only"
// import { AspectRatio } from "@/components/ui/aspect-ratio"

interface VideoPlayerProps {
  animeResponse: IAnilistInfo
  anilistId: string
  currentUser: any
  views: number
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  animeResponse,
  anilistId,
  currentUser,
  views = 0,
}) => {
  const searchParams = useSearchParams()
  const type = searchParams.get("type") || "sub"
  const ep = searchParams.get("ep")
  const provider = searchParams.get("provider") || "gogoanime"
  const episodeNumber = Number(ep) || 1

  const { download } = useWatchStore()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState(false)
  const [selectedBackgroundImage, setSelectedBackgroundImage] =
    useState<string>("")
  const [episodesList, setEpisodesLists] = useState<IEpisode[]>([])
  const [episodesNavigation, setEpisodeNavigation] = useState<IEpisode | null>(
    null
  )

  const [videoSource, setVideoSource] = useState<IZoroSource | null>(null)

  useEffect(() => {
    let isMounted = true

    const fetchData = async function () {
      if (episodesNavigation?.id) {
        const res = await fetch(
          `/api/anime/sources?provider=${provider}&episodeId=${episodesNavigation?.id}`
        )

        const data = (await res.json()) as IZoroSource

        if (isMounted) {
          setVideoSource(data)
        }
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [episodesNavigation?.id, provider])

  console.log(videoSource)

  useEffect(() => {
    const updateBackgroundImage = () => {
      const episodeImage = episodesNavigation?.image
      const bannerImage = animeResponse?.cover || animeResponse?.image

      const img = new Image()

      img.onload = () => {
        const newBackgroundImage = img.width > 500 ? episodeImage : bannerImage
        if (newBackgroundImage) {
          setSelectedBackgroundImage(newBackgroundImage)
        }
      }

      img.onerror = () => {
        if (bannerImage !== selectedBackgroundImage) {
          setSelectedBackgroundImage(bannerImage)
        }
      }

      img.src = episodeImage || bannerImage
    }

    if (animeResponse && episodesNavigation) {
      updateBackgroundImage()
    }
  }, [animeResponse, episodesNavigation, selectedBackgroundImage])

  const handleEpisodeSelect = (selectedEpisode: IEpisode) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("ep", `${selectedEpisode.number}`)
    window.history.pushState(null, "", `?${params.toString()}`)
  }

  useEffect(() => {
    let isMounted = true
    const fetchData = async function () {
      setIsPending(true)

      if (!anilistId) return

      try {
        const dub = type === "dub" ? true : false
        if (provider && type) {
          const data = (await fetchAnimeEpisodes(
            anilistId,
            provider,
            dub
          )) as IEpisode[]

          console.log(data)

          if (isMounted && data) {
            if (data.length !== 0) {
              setEpisodesLists(data)
            }
          }
        }
      } catch (error) {
        console.error("Error")
        setError(true)
      } finally {
        setIsPending(false)
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [anilistId, episodeNumber, type, provider])

  useEffect(() => {
    if (episodesList?.length === 0 && provider === "gogoanime") {
      const params = new URLSearchParams(searchParams.toString())
      params.set("provider", `zoro`)
      window.history.pushState(null, "", `?${params.toString()}`)
    }
  }, [episodesList?.length, searchParams, provider])

  useEffect(() => {
    if (episodesList) {
      const currentEpisode = episodesList.find(
        (ep) => ep.number === episodeNumber
      )

      if (currentEpisode) {
        setEpisodeNavigation(currentEpisode)
      }
    }
  }, [episodeNumber, episodesList, provider])

  useEffect(() => {
    const mediaSession = navigator.mediaSession
    if (!mediaSession) return

    const poster = episodesNavigation?.image || animeResponse?.cover
    const title = episodesNavigation?.title || animeResponse?.title?.romaji

    const artwork = poster
      ? [{ src: poster, sizes: "512x512", type: "image/jpeg" }]
      : undefined

    mediaSession.metadata = new MediaMetadata({
      title: title,
      artist: `AnimeHi ${
        title === animeResponse?.title?.romaji
          ? "- Episode " + episodeNumber
          : `- ${animeResponse?.title?.romaji || animeResponse?.title?.english}`
      }`,
      artwork,
    })
  }, [episodesNavigation, animeResponse, episodeNumber])

  const latestEpisodeNumber = useMemo(
    () => (episodesList.length ? episodesList.length : 1),
    [episodesList]
  )

  const thumbnails = videoSource?.data.tracks.find(
    (t) => t.kind === "thumbnails"
  )

  const subtitles = videoSource?.data.tracks.find((t) => t.kind === "captions")

  return (
    <ClientOnly>
      {error ? (
        <div>Please try again</div>
      ) : isPending ? (
        <div className="flex animate-pulse">
          <div className="relative h-0 w-full rounded-md bg-primary/10 pt-[56%]"></div>
        </div>
      ) : (
        <VidstackPlayer
          type={type}
          videoUrl={videoSource?.data.sources[0].url!}
          subtitle={subtitles?.file}
          thumbnail={thumbnails?.file}
          provider={provider}
          malId={`${animeResponse.malId}`}
          episodeId={episodesNavigation?.id!}
          animeResponse={animeResponse}
          episodeNumber={episodesNavigation?.number!}
          latestEpisodeNumber={latestEpisodeNumber}
          anilistId={anilistId}
          banner={selectedBackgroundImage}
          currentEpisode={episodesNavigation!}
          title={`${animeResponse.title.english ?? animeResponse.title.romaji}`}
        />
      )}

      {provider && episodesNavigation && type ? (
        <Server
          download={download ?? ""}
          animeResult={animeResponse}
          animeId={anilistId}
          anilistId={anilistId}
          currentUser={currentUser}
          lastEpisode={episodesNavigation?.number!}
          views={views}
        >
          <ButtonAction
            isLoading={isPending}
            latestEpisodeNumber={latestEpisodeNumber}
            anilistId={anilistId}
            lastEpisode={episodesNavigation?.number!}
            animeTitle={anilistId}
            provider={provider}
            type={type}
          />
        </Server>
      ) : null}

      <Episodes
        episodes={episodesList}
        isLoading={isPending}
        animeId={anilistId}
        episodeNumber={episodesNavigation?.number!}
        onEpisodeSelect={(epNum: number) => {
          if (episodesList) {
            const episode = episodesList?.find((e) => e.number === epNum)
            if (episode) {
              handleEpisodeSelect(episode)
            }
          }
        }}
      />

      <RelationWatch relations={animeResponse.relations} />
      <div className="mt-4 px-[2%] lg:px-0">
        <h3 className="flex w-full items-center pt-2.5 text-left text-sm font-semibold md:text-base">
          <div className="mr-2 h-6 w-2 rounded-md bg-primary md:h-8"></div>
          Comments
          <Badge className="ml-2">Beta</Badge>
        </h3>
        <div className="mt-2 w-full rounded-sm bg-destructive px-2 py-5 text-center text-sm md:text-base">
          Respect others. Be nice. No spam. No hate speech.
        </div>

        <div className="my-4 flex items-center gap-2 text-xs md:text-sm">
          <LuMessageSquare />

          <span>Comments EP {episodeNumber}</span>
        </div>
      </div>

      {!isPending && episodesNavigation ? (
        <Comments
          anilistId={anilistId}
          episodeNumber={`${episodesNavigation.number}`}
          animeTitle={animeResponse.title.english ?? animeResponse.title.romaji}
        />
      ) : (
        <></>
      )}

      {/* <Sharethis /> */}
    </ClientOnly>
  )
}

export default VideoPlayer
