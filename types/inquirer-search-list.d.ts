declare module 'inquirer-search-list' {
    import { QuestionCollection } from 'inquirer';

    interface SearchListQuestion<T = any> extends QuestionCollection<T> {
        type: 'search-list';
        name: string;
        message: string;
        choices: Array<{ name: string; value: any }>;
        pageSize?: number;
        searchable?: boolean;
    }

    type PromptConstructor = new (question: SearchListQuestion, rl: any, answers: any) => any;
    const searchList: PromptConstructor;
    export default searchList;
}