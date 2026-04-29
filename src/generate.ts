import { OpenRouter } from "@openrouter/sdk";
import { z } from "zod";
import { env } from "@/env";
import { db, schema } from "@/db";
import { eq, inArray } from "drizzle-orm";

const client = new OpenRouter({
  apiKey: env.ROUTER_KEY,
});

const RecipeSchema = z.object({
  title: z.string().max(200),
  description: z.string(),
  cookingTime: z.int32().min(1).describe("minutes"),
  difficulty: z.int32().min(1).max(5),
  cuisine: z.string().describe("country"),
  allergens: z.string().array(),
  ingredients: z
    .object({
      quantity: z.int32().min(1),
      measurement: z.enum(["GRAMS", "PIECES", "MILLILITERS"]),
      name: z.string(),
    })
    .array(),
});

export const generate = async (prompt: string, userId: number) => {
  console.log(`[generate] started userId=${userId} prompt="${prompt}"`);

  const response = await client.chat.send({
    chatRequest: {
      model: "openrouter/free",
      messages: [
        {
          role: "system",
          content: "Return only valid JSON matching the schema",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      responseFormat: {
        type: "json_schema",
        jsonSchema: {
          name: "recipe",
          strict: true,
          schema: RecipeSchema.toJSONSchema(),
        },
      },
    },
  });

  const recipe = RecipeSchema.parse(
    JSON.parse(response.choices[0].message.content),
  );

  await db.transaction(async (tx) => {
    // add missing cuisine
    let cuisine = await tx.query.cuisines.findFirst({
      where: eq(schema.cuisines.name, recipe.cuisine),
    });
    if (typeof cuisine === "undefined") {
      [cuisine] = await tx
        .insert(schema.cuisines)
        .values({
          name: recipe.cuisine,
        })
        .returning();
    }
    // add missing allergens
    const allergensExist = (
      await tx.query.allergens.findMany({
        columns: {
          name: true,
        },
        where: inArray(schema.allergens.name, recipe.allergens),
      })
    ).map(({ name }) => name);
    const allergensMissing = recipe.allergens
      .filter((allergen) => !allergensExist.includes(allergen))
      .map((name) => ({ name }));
    await tx.insert(schema.allergens).values(allergensMissing);
    const allergens = await tx.query.allergens.findMany({
      where: inArray(schema.allergens.name, recipe.allergens),
    });
    // add missing ingredients
    const ingredientsExist = (
      await tx.query.ingredients.findMany({
        columns: {
          name: true,
        },
        where: inArray(
          schema.ingredients.name,
          recipe.ingredients.map((i) => i.name),
        ),
      })
    ).map(({ name }) => name);
    const ingredientsMissing = recipe.ingredients
      .filter((ingredient) => !ingredientsExist.includes(ingredient.name))
      .map(({ name }) => ({ name }));
    await tx.insert(schema.ingredients).values(ingredientsMissing);
    const ingredients = (
      await tx.query.ingredients.findMany({
        where: inArray(
          schema.ingredients.name,
          recipe.ingredients.map((i) => i.name),
        ),
      })
    ).map((ingredient) => {
      const passedIngredient = recipe.ingredients.find(
        (i) => i.name === ingredient.name,
      );
      if (typeof passedIngredient === "undefined") throw new Error("not found");
      const measurement: schema.MeasurementEnum = (() => {
        if (passedIngredient.measurement === "GRAMS") return 1;
        if (passedIngredient.measurement === "PIECES") return 2;
        if (passedIngredient.measurement === "MILLILITERS") return 3;
        throw new Error("not found");
      })();
      return {
        ...ingredient,
        quantity: passedIngredient.quantity,
        measurement,
      };
    });
    // add missing recipe
    const recipeExists = await tx.query.recipes.findFirst({
      where: eq(schema.recipes.title, recipe.title),
    });
    if (typeof recipeExists === "undefined") {
      const [newRecipe] = await tx
        .insert(schema.recipes)
        .values({
          title: recipe.title,
          description: recipe.description,
          cookingTime: recipe.cookingTime,
          difficulty: recipe.difficulty,
          cuisineId: cuisine.id,
          authorId: userId,
        })
        .returning();
      await tx.insert(schema.recipeAllergens).values(
        allergens.map((allergen) => ({
          recipeId: newRecipe.id,
          allergenId: allergen.id,
        })),
      );
      await tx.insert(schema.recipeIngredients).values(
        ingredients.map((ingredient) => ({
          recipeId: newRecipe.id,
          ingredientId: ingredient.id,
          quantity: ingredient.quantity,
          measurement: ingredient.measurement,
        })),
      );
    }
  });
};
