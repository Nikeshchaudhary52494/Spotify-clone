"use client"

import {
    FieldValues,
    SubmitHandler,
    useForm
} from "react-hook-form";
import toast from "react-hot-toast";
import uniqid from "uniqid"
import { useRouter } from "next/navigation";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useState } from "react";


import { useUser } from "@/hooks/useUser";
import useUploadModel from "@/hooks/useUploadModal";


import Input from "./Input";
import Modal from "./Modal";
import Button from "./Button";


const UploadModal = () => {
    const uploadModel = useUploadModel();
    const { user } = useUser();
    const supabaseClient = useSupabaseClient();
    const router = useRouter();

    const [isLoading, setIsLoading] = useState(false);

    const {
        reset,
        handleSubmit,
        register,
    } = useForm<FieldValues>({
        defaultValues: {
            author: '',
            title: '',
            song: null,
            image: null
        }
    })

    const onChange = (open: boolean) => {
        if (!open) {
            reset();
            uploadModel.onClose();
        }
    }

    const onSubmit: SubmitHandler<FieldValues> = async (values) => {
        try {
            setIsLoading(true);
            const imageFile = values.image?.[0];
            const songFile = values.song?.[0];
            if (!imageFile && !songFile && !user) {
                toast.error("Missing fields");
                return;
            }

            const uniqueID = uniqid();

            // upload song
            const {
                data: songData,
                error: SongError
            } = await supabaseClient
                .storage
                .from('songs')
                .upload(`song-${values.title}-${uniqueID}`, songFile, {
                    cacheControl: '3600',
                    upsert: false
                })
            if (SongError) {
                return toast.error("Faild song upload");
            }
            // upload image
            const {
                data: imageData,
                error: imageError
            } = await supabaseClient
                .storage
                .from('images')
                .upload(`image-${values.title}-${uniqueID}`, imageFile, {
                    cacheControl: '3600',
                    upsert: false
                })
            if (imageError) {
                return toast.error("Faild image upload");
            }

            const {
                error: supabaseError
            } = await supabaseClient
                .from('songs')
                .insert({
                    user_id: user?.id,
                    title: values.title,
                    author: values.author,
                    image_path: imageData.path,
                    song_path: songData.path
                });

            if (supabaseError) {
                setIsLoading(false);
                return toast.error(supabaseError.message);
            }

            router.refresh();
            setIsLoading(false);
            toast.success("Song uploaded successfully");
            reset();
            uploadModel.onClose();

        } catch (error) {
            toast.error("Somethng went wrong");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Modal
            title="Add a song"
            description="Upload a Mp3 file"
            isOpen={uploadModel.isOpen}
            onChange={onChange}
        >
            <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex flex-col gap-y-4"
            >
                <Input
                    id="title"
                    disabled={isLoading}
                    {...register('title', { required: true })}
                    placeholder="Song title"
                />
                <Input
                    id="author"
                    disabled={isLoading}
                    {...register('author', { required: true })}
                    placeholder="Song author"
                />
                <div className="pb-1">
                    Select a song file
                    <Input
                        id="song"
                        type="file"
                        accept=".mp3"
                        disabled={isLoading}
                        {...register('song', { required: true })}
                    />
                </div>
                <div className="pb-1">
                    Select a song file
                    <Input
                        id="image"
                        type="file"
                        accept="image/*"
                        disabled={isLoading}
                        {...register('image', { required: true })}
                    />
                </div>
                <Button
                    type="submit"
                    disabled={isLoading}
                    className="rounded-md text-white font-normal text-sm"
                >
                    Upload
                </Button>
            </form>
        </Modal >
    )
}

export default UploadModal