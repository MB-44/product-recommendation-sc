import { json, redirect } from "@remix-run/node";
import { useLoaderData, Form, useActionData } from "@remix-run/react";
import prisma from "../../db.server";
import {
  Card,
  FormLayout,
  Page,
  TextField,
  Button,
  Heading,
} from "@shopify/polaris";
import { useState } from "react";

export const loader = async () => {
  // Load the existing quiz if one exists.
  const quiz = await prisma.quiz.findFirst({
    include: {
      questions: {
        include: { answers: true },
      },
    },
  });
  return json({ quiz });
};

export const action = async ({ request }) => {
  const formData = await request.formData();
  const title = formData.get("title");
  // We expect questions to be provided as a JSON string.
  const questionsJSON = formData.get("questions");
  let questions;
  try {
    questions = JSON.parse(questionsJSON);
  } catch (error) {
    return json({ error: "Invalid JSON for questions" }, { status: 400 });
  }

  // For demonstration, we create a new quiz.
  await prisma.quiz.create({
    data: {
      title,
      questions: {
        create: questions.map((q) => ({
          text: q.text,
          answers: {
            create: q.answers,
          },
        })),
      },
    },
  });

  return redirect("/admin/quiz");
};

export default function AdminQuiz() {
  const { quiz } = useLoaderData();
  const actionData = useActionData();
  const [title, setTitle] = useState(quiz?.title || "");
  // Use a safe default for quiz questions.
  const [questionsJSON, setQuestionsJSON] = useState(
    JSON.stringify(
      (quiz?.questions ?? []).map((q) => ({
        text: q.text,
        answers: q.answers,
      })),
      null,
      2
    )
  );

  return (
    <Page title="Quiz Configuration">
      <Card sectioned>
        <Heading>Configure Your Quiz</Heading>
        <Form method="post">
          <FormLayout>
            <TextField
              label="Quiz Title"
              name="title"
              value={title}
              onChange={setTitle}
            />
            <TextField
              label="Questions JSON"
              name="questions"
              value={questionsJSON}
              onChange={setQuestionsJSON}
              multiline
              helpText={
                `Enter questions as JSON. For example:
[
  {
    "text": "What is your favorite color?",
    "answers": [
      { "text": "Red", "recommendationTag": "red" },
      { "text": "Blue", "recommendationTag": "blue" }
    ]
  }
]`
              }
            />
            <Button submit primary>
              Save Quiz
            </Button>
          </FormLayout>
        </Form>
        {actionData?.error && (
          <p style={{ color: "red" }}>{actionData.error}</p>
        )}
      </Card>
    </Page>
  );
}