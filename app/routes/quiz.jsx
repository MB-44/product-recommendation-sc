import { json } from "@remix-run/node";
import { useLoaderData, Form, useActionData } from "@remix-run/react";
import prisma from "../db.server";
import shopify, { authenticate } from "../shopify.server";
import { Page, Card, FormLayout, Button, Text } from "@shopify/polaris";

export const loader = async ({ request }) => {
  const quiz = await prisma.quiz.findFirst({
    include: {
      questions: {
        include: { answers: true },
      },
    },
  });
  if (!quiz) throw new Response("No quiz configured", { status: 404 });
  return json({ quiz });
};

export const action = async ({ request }) => {
  const formData = await request.formData();
  
  let recommendationCounts = {};
  for (let [key, value] of formData.entries()) {
    if (key.startsWith("question_")) {
      recommendationCounts[value] = (recommendationCounts[value] || 0) + 1;
    }
  }
  const bestTag =
    Object.entries(recommendationCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    "default";

  const { admin } = await authenticate.admin(request);

  const productsResponse = await admin.graphql(
    `#graphql
    {
      products(first: 5, query: "tag:${bestTag}") {
        edges {
          node {
            id
            title
            handle
          }
        }
      }
    }`
  );

  // Process the response.
  const productsData = await productsResponse.json();
  const products = productsData.data.products.edges.map((edge) => edge.node);

  const recommendationMessage = `Based on your answers, we recommend these products: ${products
    .map((p) => p.title)
    .join(", ")}`;

  return json({ recommendation: recommendationMessage });
};

export default function QuizPage() {
  const { quiz } = useLoaderData();
  const actionData = useActionData();

  return (
    <Page title="Take the Quiz">
      <Card sectioned>
        <Text variant="headingMd">{quiz.title}</Text>
        <Form method="post">
          <FormLayout>
            {quiz.questions.map((question) => (
              <div key={question.id} style={{ marginBottom: "1rem" }}>
                <Text variant="bodyMd" as="p">
                  {question.text}
                </Text>
                {question.answers.map((answer) => (
                  <div key={answer.id}>
                    <label>
                      <input
                        type="radio"
                        name={`question_${question.id}`}
                        value={answer.recommendationTag}
                        required
                      />
                      {answer.text}
                    </label>
                  </div>
                ))}
              </div>
            ))}
            <Button submit primary>
              Submit Answers
            </Button>
          </FormLayout>
        </Form>
        {actionData?.recommendation && (
          <Card sectioned>
            <Text variant="bodyMd">{actionData.recommendation}</Text>
          </Card>
        )}
      </Card>
    </Page>
  );
}