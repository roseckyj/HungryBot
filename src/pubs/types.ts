export type PubDescriptor =
    | {
          type: 'menicka';
          id: number;
          color: number;
          icon: string;
      }
    | {
          type: 'wolt';
          link: string;
          categories: RegExp[];
          color: number;
          icon: string;
      }
    | {
          type: 'static';
          link: string;
          name: string;
          color: number;
          icon: string;
      }
    | {
          type: 'function';
          link: string;
          name: string;
          color: number;
          icon: string;
          evaluate: () => Promise<Menu | null>;
      };

export type PubInfo = {
    name: string;
    address: string;
    website: string;
    image?: string;
    color: number;
    icon: string;
};

export type Menu = {
    pub: PubInfo;
    items: MenuItem[] | null;
};

export type MenuItem = {
    item: string;
    price: number | null;
};
