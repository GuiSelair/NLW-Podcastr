import { GetStaticProps } from "next";
import { format, parseISO } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR';
import Image from 'next/image';
import Link from 'next/link';

import api from "../services/api";
import { convertDurationToTimeString } from "../utils/convertDurationToTimeString";
import styles from "../styles/home.module.scss";
import { useCallback, useEffect, useRef, useState } from "react";

interface IEpisodes {
  id: string;
  title: string;
  members: string;
  publishedAt: string;
  thumbnail: string;
  description: string;
  durationAsString: string;
  url: string;
}

interface IHome {
  allEpisodes: IEpisodes[];
  latestEpisodes: IEpisodes[];
}

export default function Home({ allEpisodes, latestEpisodes }: IHome) {
  const [episodes, setEpisodes] = useState(allEpisodes);
  const [currentPage, setCurrentPage] = useState(2);
  const [hasEndingPosts, setHasEndingPosts] = useState(false);
  const loaderRef = useRef(null);

  useEffect(() => {
    const options = {
      root: null,
      rootMargin: "20px",
      threshold: 1.0
    };

    const observer = new IntersectionObserver((entities) => {
      console.log(entities);
      const target = entities[0];

      if (target.isIntersecting){
        setCurrentPage(old => old + 1);
      }
    }, options);

    if (loaderRef.current){
      console.log("Declarando Observer:", observer);
      observer.observe(loaderRef.current);
    }
  }, []);

  useEffect(() => {
    console.log("handleLoadMore");
    const handleResquest = async () => {
      const { data } = await api.get('episodes', {
        params: {
          _page: currentPage,
          _limit: 2,
          _sort:"published_at",
          _order: "desc"
        }
      });
      console.log({data});

      if (!data.length){
        setHasEndingPosts(true);
        return;
      }

      const newEpisodes = data.map(episode => {
        return {
          id: episode.id,
          title: episode.title,
          thumbnail: episode.thumbnail,
          members: episode.members,
          publishedAt: format(parseISO(episode.published_at), 'd MMM yy', {
            locale: ptBR,
          }),
          durationAsString: convertDurationToTimeString(Number(episode.file.duration)),
          description: episode.description,
          url: episode.file.url,
        }
      });

      setEpisodes([...episodes, ...newEpisodes]);
    }
    handleResquest();
  }, [currentPage]);

  return (
    <div className={styles.homepage}>
      <section className={styles.latestEpisodes}>
        <h2>Últimos lançamentos</h2>
        <ul>
          {latestEpisodes.map(episode => (
            <li key={episode.id}>
              <Image
                src={episode.thumbnail}
                alt={episode.title}
                width={192}
                height={192}
                objectFit="cover"
              />

              <div className={styles.episodeDetails}>
                <Link href={`/episodes/${episode.id}`}>
                  <a>{episode.title}</a>
                </Link>
                <p>{episode.members}</p>
                <span>{episode.publishedAt}</span>
                <span>{episode.durationAsString}</span>
              </div>

              <button type="button">
                <img src="/play-green.svg" alt="Tocar episodio"/>
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section className={styles.allEpisodes} >
        <h2>Todos episódios</h2>
        <table cellSpacing={0}>
          <thead>
            <tr>
              <th></th>
              <th>Podcast</th>
              <th>Integrantes</th>
              <th>Data</th>
              <th>Duração</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {episodes.map(episode => (
              <tr key={episode.id}>
                <td style={{width: 72}}>
                  <Image width={120} height={120} src={episode.thumbnail} alt={episode.title} objectFit="cover"/>
                </td>
                <td>
                  <Link href={`/episodes/${episode.id}`}>
                    <a>{episode.title}</a>
                  </Link>
                </td>
                <td>{episode.members}</td>
                <td style={{width: 100}}>{episode.publishedAt}</td>
                <td>{episode.durationAsString}</td>
                <td>
                  <button type="button">
                    <img src="/play-green.svg" alt="Tocar episódio"/>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!hasEndingPosts && <p ref={loaderRef}>Carregar mais episodios...</p>}
      </section>
    </div>
  )
}

export const getStaticProps: GetStaticProps = async (context) => {
  const { data } = await api.get('episodes', {
    params: {
      _page: 1,
      _limit: 2,
      _sort:"published_at",
      _order: "desc"
    }
  });
  const episodes = data.map(episode => {
    return {
      id: episode.id,
      title: episode.title,
      thumbnail: episode.thumbnail,
      members: episode.members,
      publishedAt: format(parseISO(episode.published_at), 'd MMM yy', {
        locale: ptBR,
      }),
      durationAsString: convertDurationToTimeString(Number(episode.file.duration)),
      description: episode.description,
      url: episode.file.url,
    }
  });

  const latestEpisodes = episodes.slice(0, 2);
  const allEpisodes = episodes.slice(2, episodes.length);

  return {
    props: {
      latestEpisodes,
      allEpisodes,
    },
    revalidate: 60*60*8,
  }
};
