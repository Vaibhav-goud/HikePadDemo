declare module 'react-organizational-chart' {
    import { ReactNode, ComponentType } from 'react';

    export interface TreeProps {
        label: ReactNode;
        lineColor?: string;
        lineWidth?: string;
        lineHeight?: string;
        lineBorderRadius?: string;
        children?: ReactNode;
    }

    export interface TreeNodeProps {
        label: ReactNode;
        children?: ReactNode;
    }

    export const Tree: ComponentType<TreeProps>;
    export const TreeNode: ComponentType<TreeNodeProps>;
}
