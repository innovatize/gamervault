import SearchBar from "@/components/games/SearchBar";
import { GetServerSidePropsContext } from "next";
import { stringOrFirstString } from "@/utils/helper";
import { createClient } from "@/utils/supabase/server-props";
import { CardProps } from "@/utils/types";
import Card from "@/components/games/Card";
import { useState } from "react";
import { createClient as createBrowserClient} from "@/utils/supabase/component";
import { useContext } from "react";
import { UserDataContext } from "@/utils/context/UserDataContext";
import Head from "next/head";


type GamesListPageProps = {
    gamesList: CardProps[],
    title: string,
    function: string
}

const listNameMap: Record<string, {title: string, function: string}> = {
    "liked": {
        title: "Liked Games",
        function: "get_liked_games",
    },
    "saved": {
        title: "Saved Games",
        function: "get_saved_games"
    }
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
    const listName = stringOrFirstString(context.params?.listname);
    if (!listName || !(listName in listNameMap)) {
        return {
            redirect: {
                destination: "/",
                permanent: false
            }
        }
    }

    const supabase = createClient(context);
    const {data: userData, error} = await supabase.auth.getUser();
    let userId = process.env.NEXT_PUBLIC_DUMMY_UUID!;
    if (!error) {
        userId = userData.user.id;
    } else {
        return {
            redirect: {
                destination: "/",
                permanent: false
            }
        }
    }

    const listMetadata = listNameMap[listName];
    const listTitle = listMetadata.title;
    const listFunction = listMetadata.function;
    const {data: gamesListData, error: gamesListError} = await supabase.rpc(listFunction, {
        user_id: userId,
        page: 0,
        n_results: 30
    });

    if (gamesListError) {
        return {
            props: {
                gamesList: [],
                title: listTitle
            }
        }
    }

    let gamesList = gamesListData;
    
    if (listName === "liked") {
        gamesList = gamesListData.map((game: CardProps) => {
            return {
                ...game,
                is_liked_by_user: true
            }
        });
    } else if (listName === "saved") {
        gamesList = gamesListData.map((game: CardProps) => {
            return {
                ...game,
                is_saved_by_user: true
            }
        });
    }
    
    
    return {
        props: {
            gamesList: gamesList,
            title: listTitle,
            function: listFunction
        }
    }
}

function ActivityGamesListPage(props: GamesListPageProps) {
    const [page, setPage] = useState(0);
    const [gamesList, setGamesList] = useState(props.gamesList);
    const [isLastPage, setIsLastPage] = useState(false);
    const userData = useContext(UserDataContext);
    const supabase = createBrowserClient();

    async function handleLoadMore() {
        if (isLastPage) {
            return
        }
        setPage(page + 1);
        const userId = userData?.id || process.env.NEXT_PUBLIC_DUMMY_UUID!;
        const {data: gamesListData, error: gamesListError} = await supabase.rpc(props.function, {
            user_id: userId,
            page: page + 1,
            n_results: 30
        });

        if (!gamesListError) {
            if (Array.isArray(gamesListData)) {
                if (gamesListData.length < 30) {
                    setIsLastPage(true);
                }
                setGamesList((oldGamesList) => {
                    return [
                        ...oldGamesList,
                        ...gamesListData as CardProps[]
                    ]
                });
            }
        }
    }

    const gamesCards = gamesList.map((game, index) => {
        return <Card key={game.game_id} {...game} />
    });
    

    return (
        <div className="flex flex-col gap-6 py-3">
            <Head>
                <title>{props.title} - Gamervault</title>
            </Head>
            <h1 className="text-4xl font-extrabold text-center sm:text-left">{props.title}</h1>

            {/* Games Grid */}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] justify-items-center sm:grid-cols-[repeat(auto-fill,minmax(12.5rem,1fr))]  gap-8">
                {gamesCards}
            </div>
            
            
            {
                !isLastPage &&
                <button className="button-primary rounded-full text-2xl" onClick={handleLoadMore}>Load more</button>
            }
        </div>
    );
}

export default ActivityGamesListPage;