"use server";

import { Question } from "@database";
import Answer from "@database/answer.model";
import { connectToDB } from "@lib/mongoose";
import {
  IAnswerVoteParams,
  ICreateAnswerParams,
  IDeleteAnswerParams,
  IGetQuestionAnswersParams,
  IGetUserStatsParams,
} from "@types";
import { revalidatePath } from "next/cache";
import { getUpdateQuery } from "./general.actions";
import Interaction from "@database/interaction.models";

export const createAnswer = async (params: ICreateAnswerParams) => {
  await connectToDB().catch((error: Error) => {
    throw new Error(error.message);
  });

  const { content, author, questionId, path } = params;

  try {
    const newAnswer = await Answer.create({
      content,
      author,
      question: questionId,
    });
    await Question.findByIdAndUpdate(questionId, {
      $push: { answers: newAnswer._id },
    });
  } catch (error) {
    throw new Error(
      "Issue while trying to create a new answer: " +
        (error instanceof Error ? error.message : error),
    );
  }
  revalidatePath(path);
};

export const getQuestionAnswers = async (params: IGetQuestionAnswersParams) => {
  await connectToDB().catch((error: Error) => {
    throw new Error(error.message);
  });

  const { questionId, filter, page = 1, limit = 5 } = params;

  let sortOptions = {};
  switch (filter) {
    case "highestUpvotes":
      sortOptions = { upvotes: -1 };
      break;
    case "lowestUpvotes":
      sortOptions = { upvotes: 1 };
      break;
    case "recent":
      sortOptions = { createdAt: -1 };
      break;
    case "old":
      sortOptions = { createdAt: 1 };
      break;
  }

  const numberToSkip = (page - 1) * limit;

  let answers;
  let totalAnswers;
  try {
    answers = await Answer.find({ question: questionId })
      .populate("author", "_id clerkId name picture")
      .skip(numberToSkip)
      .limit(limit)
      .sort(sortOptions);

    totalAnswers = await Answer.countDocuments({ question: questionId });
  } catch (error) {
    throw new Error(
      "Error while trying to fetch the answers for this question." +
        (error instanceof Error ? error.message : error),
    );
  }

  const isNext = totalAnswers > numberToSkip + answers.length;

  return { answers, isNext };
};

export const voteAnswer = async (params: IAnswerVoteParams) => {
  await connectToDB().catch((error: Error) => {
    throw new Error(error.message);
  });

  const { answerId, userId, hasUpVoted, hasDownVoted, action, path } = params;
  const updateQuery = getUpdateQuery(userId, hasUpVoted, hasDownVoted, action);

  try {
    await Answer.findByIdAndUpdate(answerId, updateQuery);
  } catch (error) {
    throw new Error(
      "Error while trying to vote a answer" +
        (error instanceof Error ? error.message : error),
    );
  }

  revalidatePath(path);
};

export const getUserAnswers = async (params: IGetUserStatsParams) => {
  await connectToDB().catch((error: Error) => {
    throw new Error(error.message);
  });

  const { userId, page = 1, limit = 10 } = params;

  let totalAnswers, answers;
  const numberToSkip = (page - 1) * limit;

  try {
    totalAnswers = await Answer.countDocuments({ author: userId });

    answers = await Answer.find({ author: userId })
      .skip(numberToSkip)
      .limit(limit)
      .sort({ upvotes: -1 })
      .populate("question", "_id title upvotes downvotes")
      .populate("author", "_id clerkId name picture");
  } catch (error) {
    throw new Error(
      "Error while trying to get the answers written by a user" +
        (error instanceof Error ? error.message : error),
    );
  }

  const isNext = totalAnswers > numberToSkip + answers.length;
  return { totalAnswers, answers, isNext };
};

export const deleteAnswer = async (params: IDeleteAnswerParams) => {
  await connectToDB().catch((error: Error) => {
    throw new Error(error.message);
  });

  const { answerId, path } = params;
  try {
    await Answer.deleteOne({ _id: answerId });
    await Question.updateMany(
      { answers: answerId },
      { $pull: { answers: answerId } },
    );
    await Interaction.updateMany({ answer: answerId });
  } catch (error) {
    throw new Error(
      "Error while trying to delete an answer" +
        (error instanceof Error ? error.message : error),
    );
  }

  revalidatePath(path);
};
