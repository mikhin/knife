declare module "snowball-stemmers" {
  export type Stemmer = {
    stem: (word: string) => string;
  };

  export const newStemmer: (algorithm: string) => Stemmer;
}
