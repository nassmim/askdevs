"use client";
import React, { useRef, useState } from "react";
import { Editor } from "@tinymce/tinymce-react";

import { zodResolver } from "@hookform/resolvers/zod";
import { QuestionFormSchema, questionFormFields } from "@lib/validations";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@components/ui/badge";
import Image from "next/image";
import { createQuestion, editQuestion } from "@actions/question.actions";
import { usePathname, useRouter } from "next/navigation";
import { pages, themes } from "@constants";
import { useTheme } from "@context/ThemeProvider";
import { PopulatedQuestionType } from "@types";

type FormType = z.infer<typeof QuestionFormSchema>;

const Question = ({
  type,
  userId,
  questionDetails,
}: {
  type?: string;
  userId: string;
  questionDetails?: string;
}) => {
  const { mode } = useTheme();
  const editorRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const pathName = usePathname();

  let parsedQuestionDetails: PopulatedQuestionType | undefined;
  let tagsNames: string[] | undefined;

  if (questionDetails) {
    parsedQuestionDetails = JSON.parse(
      questionDetails,
    ) as PopulatedQuestionType;
    tagsNames = parsedQuestionDetails?.tags.map((tag) => tag.name);
  }

  const form = useForm<FormType>({
    resolver: zodResolver(QuestionFormSchema),
    defaultValues: {
      title: parsedQuestionDetails?.title,
      explanation: "",
      tags: tagsNames || [],
    },
  });

  const onSubmit = async (values: FormType) => {
    setIsSubmitting(true);

    try {
      if (type === "edit") {
        try {
          await editQuestion({
            questionId: parsedQuestionDetails!._id,
            title: values.title,
            content: values.explanation,
            path: pathName,
          });
        } catch (error) {
          return;
        }

        router.push(`${pages.question}/${parsedQuestionDetails!._id}`);
      } else {
        try {
          await createQuestion({
            title: values.title,
            content: values.explanation,
            tags: values.tags,
            author: JSON.parse(userId),
            path: pathName,
          });
        } catch (error) {
          console.log(
            "There was an issue while trying to add the question. Details: " +
              (error as Error).message,
          );
          return;
        }
      }
    } catch (error) {
    } finally {
      setIsSubmitting(false);
    }

    router.push(pages.home);
  };

  const handleInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    field: any,
  ) => {
    if (e.key === "Enter" && field.name === questionFormFields.tags) {
      e.preventDefault();
      const tagInput = e.target as HTMLInputElement;
      const tagValue = tagInput.value.trim();

      if (tagValue !== "") {
        if (!field.value.includes(tagValue)) {
          form.setValue(questionFormFields.tags, [...field.value, tagValue]);
          tagInput.value = "";
          form.clearErrors(questionFormFields.tags);
        }
      }
    }
  };

  const handleTagRemove = (tag: string, field: any) => {
    const newTags = field.value.filter((item: string) => item !== tag);
    form.setValue(questionFormFields.tags, newTags);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex w-full flex-col gap-10"
      >
        <FormField
          control={form.control}
          name={questionFormFields.title}
          render={({ field }) => (
            <FormItem className={`flex w-full flex-col`}>
              <FormLabel className="paragraph-semibold text-dark400_light800">
                Question Title
                <span className="text-primary-500">*</span>
              </FormLabel>
              <FormControl className="mt-3.5">
                <Input
                  className="paragraph-regular background-light900_dark300 light-border-2 text-dark300_light700 min-h-[56px] border"
                  {...field}
                />
              </FormControl>
              <FormDescription className="body-regular mt-2.5 text-light-500">
                Be specific and imagine you`&apos;`re asking a question to
                another person in person.
              </FormDescription>
              <FormMessage className="text-red-500" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={questionFormFields.explanation}
          render={({ field }) => (
            <FormItem className={`flex w-full flex-col gap-3`}>
              <FormLabel className="paragraph-semibold text-dark400_light800">
                Detailed explanation of your problem
                <span className="text-primary-500">*</span>
              </FormLabel>
              <FormControl className="mt-3.5">
                <Editor
                  apiKey={process.env.NEXT_PUBLIC_TINY_EDITOR_API_KEY}
                  onInit={(_evt, editor) => {
                    // @ts-ignore
                    editorRef.current = editor;
                  }}
                  initialValue={parsedQuestionDetails?.content}
                  onBlur={field.onBlur}
                  onEditorChange={(content) => field.onChange(content)}
                  init={{
                    height: 350,
                    menubar: false,
                    plugins: [
                      "advlist",
                      "autolink",
                      "lists",
                      "link",
                      "image",
                      "charmap",
                      "preview",
                      "anchor",
                      "searchreplace",
                      "visualblocks",
                      "codesample",
                      "fullscreen",
                      "insertdatetime",
                      "media",
                      "table",
                    ],
                    toolbar:
                      "undo redo | blocks | " +
                      "codesample | bold italic forecolor | alignleft aligncenter " +
                      "alignright alignjustify | bullist numlist outdent indent | ",
                    content_style: "body { font-family:Inter; font-size:16px }",
                    skin: mode === themes.dark.value ? "oxide-dark" : "oxide",
                    content_css:
                      mode === themes.dark.value
                        ? themes.dark.value
                        : themes.light.value,
                  }}
                />
              </FormControl>
              <FormDescription className="body-regular mt-2.5 text-light-500">
                Introduce the problem and expand on what you put in the title
              </FormDescription>
              <FormMessage className="text-red-500" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={questionFormFields.tags}
          render={({ field }) => (
            <FormItem className={`flex w-full flex-col`}>
              <FormLabel className="paragraph-semibold text-dark400_light800">
                Tags
                <span className="text-primary-500">*</span>
              </FormLabel>
              <FormControl className="mt-3.5">
                <>
                  <Input
                    placeholder="Add tags..."
                    className="no-focus paragraph-regular background-light900_dark300 light-border-2 text-dark300_light700 min-h-[56px] border"
                    onKeyDown={(e) => handleInputKeyDown(e, field)}
                    disabled={type === "edit"}
                  />
                  {field.value.length > 0 && (
                    <div className="flex-start mt-2.5 gap-2.5">
                      {field.value.map((tag: any) => (
                        <Badge
                          key={tag}
                          className="subtle-medium background-light800_dark300 text-light400_light500 flex items-center justify-center gap-2 border-none px-4 py-2 capitalize"
                          onClick={() =>
                            type !== "edit" && handleTagRemove(tag, field)
                          }
                        >
                          {tag}
                          {type !== "edit" && (
                            <Image
                              src="/assets/icons/close.svg"
                              alt="Close icon"
                              width={12}
                              height={12}
                              className="cursor-pointer object-contain invert-0 dark:invert"
                            />
                          )}
                        </Badge>
                      ))}
                    </div>
                  )}
                </>
              </FormControl>
              <FormDescription className="body-regular mt-2.5 text-light-500">
                Add up to 3 tags to describe what your question is about. Press
                enter to add a tag.
              </FormDescription>
              <FormMessage className="text-red-500" />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="primary-gradient w-fit !text-light-900"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>{type === "edit" ? "Editing..." : "Posting..."}</>
          ) : (
            <>{type === "edit" ? "Edit Question" : "Ask a Question"}</>
          )}
        </Button>
      </form>
    </Form>
  );
};

export default Question;
